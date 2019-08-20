frappe.pages['better-dash'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'A Better Dashboard',
		single_column: true
	});
	new better_dash(page);

}
frappe.pages['better-dash'].refresh = function (wrapper) {

}
class better_dash {
	constructor(page) {
		this.page = page;
		var date_field = undefined;
		this.mainfunc = function () {
			var me = this;
			frappe.call({
				method: "better_dash.better_dash.page.better_dash.better_dash.get_all_data",
				args: {
					"date": date_field
				},
				callback: function (r) {
					console.log(r.message)
					page.body.html(frappe.render_template("dash_layout", { "data": r.message }));
					$("input[type='checkbox']").change(function () {
						console.log($(this).parent().parent().parent().attr("data-name"))
					});
					$('[data-toggle="tooltip"]').tooltip();
					this.date_field = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Date',
							label: 'Date',
							fieldname: 'date_field',
							onchange: () => {
								console.log(this.date_field.get_value());
								date_field = this.date_field.get_value();
								me.mainfunc();
							}
						},
						parent: $(page.body.html).find('#date-filter'),
						render_input: true
					});
					if (date_field) {
						$(this.date_field.$input).val(date_field);
					}
					this.supplier_field = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Link',
							label: 'Supplier',
							fieldname: 'supplier_field',
							options: 'Supplier',
							onchange: () => {
								console.log(this.supplier_field.get_value());
							}
						},
						parent: $(page.body.html).find('#supplier-filter'),
						render_input: true
					});
					this.customer_field = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Link',
							label: 'Customer',
							options: 'Customer',
							fieldname: 'customer_field',
							onchange: () => {
								console.log(this.customer_field.get_value());
							}
						},
						parent: $(page.body.html).find('#customer-filter'),
						render_input: true
					});
					this.medley_order_id_field = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Link',
							label: 'Medley Order Id',
							options: 'Sales Order',
							fieldname: 'medley_order_id_field',
							onchange: () => {
								console.log(this.medley_order_id_field.get_value());
							}
						},
						parent: $(page.body.html).find('#medley-oi-filter'),
						render_input: true
					});
					this.medley_master_order_id_field = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Link',
							label: 'Medley Master Order Id',
							options: 'Purchase Receipt',
							fieldname: 'medley_master_id',
							onchange: () => {
								console.log(this.medley_master_order_id_field.get_value());
							}
						},
						parent: $(page.body.html).find('#medley-masterid-filter'),
						render_input: true
					});
					this.company = frappe.ui.form.make_control({
						df: {
							fieldtype: 'Link',
							label: 'Company',
							options: 'Company',
							fieldname: 'company',
							onchange: () => {
								console.log(this.company.get_value());
							}
						},
						parent: $(page.body.html).find('#company-filter'),
						render_input: true
					});
					var $contextMenu = $("#contextMenu");

					$(".gaps .tab_drop").contextmenu(function (e) {
						var doctype = $(this).attr("data-doctype");
						var docname = $(this).attr("data-name");
						$(contextMenu).attr('data-doctype', doctype);
						$(contextMenu).attr('data-name', docname);

						$contextMenu.css({
							display: "block",
							left: e.pageX,
							top: e.pageY - 130,
							background: "#FFFFFF",
							border: "1px solid #dddddd",
							padding: ".5rem .25rem",
						});
						return false;


					});

					// this.reset_button = frappe.ui.form.make_control({
					// 	df: {
					// 		fieldtype: 'Button',
					// 		label: 'Reset',
					// 		fieldname: 'reset',
					// 		click: () => {
					// 			console.log(this.reset_button);
					// 		}
					// 	},
					// 	parent: $(page.body.html).find('#reset-filters'),
					// 	render_input: true
					// });

					$('html').click(function () {
						$contextMenu.hide();
					});

					$("#highlight_linked").click(function () {
						$(".panel-heading").css("background-color", "#f7fafc");
						var doctype = $(this).parent().parent().parent().attr("data-doctype");
						var docname = $(this).parent().parent().parent().attr("data-name");
						$("[data-doctype='" + doctype + "'][data-name='" + docname + "']").find(".panel-heading")[0].scrollIntoView();
						$("[data-doctype='" + doctype + "'][data-name='" + docname + "']").find(".panel-heading").css("background-color", "#6ebfa9");
						frappe.call({
							method: "frappe.desk.form.linked_with.get_linked_doctypes",
							args: {
								doctype: doctype
							},
							callback: (r) => {
								frappe.call({
									method: "frappe.desk.form.linked_with.get_linked_docs",
									args: {
										doctype: doctype,
										name: docname,
										linkinfo: r.message,
									},
									callback: (r) => {
										$.each(r.message, function (key, value) {

											for (let index = 0; index < r.message[key].length; index++) {
												$("[data-doctype='" + key + "'][data-name='" + r.message[key][index].name + "']").find(".panel-heading").css("background-color", "#6ebfa9");
												$("[data-doctype='" + key + "'][data-name='" + r.message[key][index].name + "']")[0].scrollIntoView();
												if (key == "Purchase Order") {

													frappe.call({
														method: "frappe.client.get_list",
														args: {
															doctype: "Purchase Receipt",
															filters: [
																["purchase_order_no", "=", r.message[key][index].name]
															],
															fields: ["name"]
														},
														callback: function (r) {
															for (let lo = 0; lo < r.message.length; lo++) {
																const element = r.message[lo];
																$("[data-doctype='Purchase Receipt'][data-name='" + element.name + "']").find(".panel-heading").css("background-color", "#6ebfa9");
																$("[data-doctype='Purchase Receipt'][data-name='" + element.name + "']")[0].scrollIntoView();
															}
														}
													});

												}

											}

										});
									}
								});
							}
						});
					});
				}
			})

		}
		this.mainfunc();
	}
}