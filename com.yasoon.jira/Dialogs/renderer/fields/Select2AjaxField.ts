/// <reference path="../Field.ts" />
/// <reference path="Select2Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
abstract class Select2AjaxField extends Select2Field {
	options: any;
	styleCss: string;
	multiple: boolean;

	private debouncedFunction;
	private currentPromise: Promise<any>;
	private currentResolve;
	private currentReject;

	constructor(id: string, field: JiraMetaField, options: any = {}, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		if (!options.ajax) {
			options.ajax = {
				url: '',
				transport: (params, success, failure) => {
					var queryTerm = '';
					if (params && params.data && params.data.q) {
						queryTerm = params.data.q;
					}
					let promise: Promise<any>;
					if (queryTerm) {
						promise = this.getDataDebounced(queryTerm);
					} else {
						promise = this.getEmptyDataInternal();
					}
					promise
						.spread((result, searchTerm) => {
							//This handler is registered multiple times on the same promise.
							//Check if we are responsible to make sure we call the correct success function
							if (searchTerm == queryTerm) {
								console.log('Result for  ' + searchTerm, result);
								success(result);
							}
						})
						.catch(error => {
							console.log(error);
							//yasoon.util.log();
							success([]);
						});
				},
				processResults: (data, page) => {
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



	private getDataDebounced(searchTerm: string): Promise<any> {
		//Complicated...
		//We don'T want to spam Promises that never fullfill...
		//So we only create Promises if the previous one is already fullfilled.
		//But we need to save all Promise Data and call them debounced...
		if (!this.currentPromise || this.currentPromise.isFulfilled()) {
			console.log('New Promise for: ' + searchTerm, this.currentPromise);
			this.currentPromise = new Promise((resolve, reject) => {
				this.currentReject = reject;
				this.currentResolve = resolve;
				this.debouncedFunction.call(this, searchTerm);
			});
			return this.currentPromise;
		}

		console.log('Existing Promise --> Debounce: - ' + searchTerm);
		this.debouncedFunction.call(this, searchTerm);
		return this.currentPromise;
	}

	private getEmptyDataInternal(): Promise<any> {
		return this.getEmptyData()
			.then(result => {
				return [result, '']; //Keep signature for spread
			});
	}

	abstract getData(searchTerm: string): Promise<any>;
	abstract getEmptyData(): Promise<any>;
}

