/// <reference path="../Field.ts" />
/// <reference path="../../../definitions/jquery.d.ts" />
/// <reference path="../../../definitions/bluebird.d.ts" />
abstract class Select2AjaxField extends Select2Field {
	options: any;
	styleCss: string;
	multiple: boolean;

	constructor(id: string, field: JiraMetaField, options: any = {}, multiple: boolean = false, style: string = "min-width: 350px; width: 80%;") {
		if (!options.ajax) {
			options.ajax = {
				url: '',
				transport: function (params, success, failure) {
					var queryTerm = '';
					if (params && params.data) {
						queryTerm = params.data.q;
					}

					this.getData(queryTerm)
						.then(function (result) {
							success(result);
						})
						.catch(function (error) {
							//yasoon.util.log();
							success([]);
						});
				}
			};
		}

		super(id, field, options, multiple, style);
	};

	abstract getData(searchTerm: string): Promise<any>;
}

