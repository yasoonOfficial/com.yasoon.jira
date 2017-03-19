import { Select2Field, Select2Element, Select2Options } from './Select2Field';
import { JiraMetaField } from '../JiraModels';

export abstract class Select2AjaxField extends Select2Field {
	options: any;
	styleCss: string;
	multiple: boolean;

	private debouncedFunction;
	private currentSearchTerm: string;
	private currentPromise: Promise<any>;
	private currentResolve;
	private currentReject;
	protected emptySearchResult: Select2Element[];

	constructor(id: string, field: JiraMetaField, options: Select2Options = {}, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		if (!options.ajax) {
			options.ajax = {
				url: '',
				transport: (params, success, failure) => {
					this.currentSearchTerm = '';
					if (params && params.data && params.data.q) {
						this.currentSearchTerm = params.data.q;
					}
					let promise: Promise<any>;
					if (this.currentSearchTerm) {
						promise = this.getDataDebounced(this.currentSearchTerm);
					} else {
						promise = this.getEmptyDataInternal();
					}

					this.showSpinner();

					promise
						.spread((result, searchTerm) => {
							//This handler is registered multiple times on the same promise.
							//Check if we are still responsible to make sure we call the correct success function
							if (searchTerm == this.currentSearchTerm) {
								this.hideSpinner();
								success(result);
							}
						})
						.catch(error => {
							this.hideSpinner();
							console.log('An error occured while fetching select2 data. Field ' + this.id, error, error.stack);
							yasoon.util.log('An error occured while fetching select2 data. ' + error.message + ' || Field: ' + this.id, yasoon.util.severity.warning, getStackTrace(error));
							success();
						});
				},
				processResults: (data, page) => {
					if (!data)
						data = [];

					return {
						results: data
					};
				}
			};
		}

		super(id, field, options, multiple, style);

		this.debouncedFunction = debounce((searchTerm) => {
			this.getData(searchTerm)
				.then((result) => {
					this.currentResolve([result, searchTerm]);
				})
				.catch((e) => {
					this.currentReject(e);
				});
		}, 500, false);
	}

	init() {
		//Not nessecary if everything is loaded on demand
	}

	private getDataDebounced(searchTerm: string): Promise<Select2Element[]> {
		//Complicated...
		//We don'T want to spam Promises that never fullfill...
		//So we only create Promises if the previous one is already fullfilled.
		//But we need to save all Promise Data and call them debounced...
		if (!this.currentPromise || this.currentPromise.isFulfilled()) {
			this.currentPromise = new Promise((resolve, reject) => {
				this.currentReject = reject;
				this.currentResolve = resolve;
				this.debouncedFunction.call(this, searchTerm);
			});
			return this.currentPromise;
		}

		this.debouncedFunction.call(this, searchTerm);
		return this.currentPromise;
	}

	private async getEmptyDataInternal(): Promise<any> {
		let result = await this.getEmptyData();
		return [result, '']; //Keep signature for spread
	}

	abstract getData(searchTerm: string): Promise<Select2Element[]>;

	async getEmptyData(): Promise<Select2Element[]> {
		if (this.emptySearchResult)
			return this.emptySearchResult;

		this.emptySearchResult = await this.getData("");
		return this.emptySearchResult;
	}
}

