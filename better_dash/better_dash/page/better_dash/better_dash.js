frappe.pages['better-dash'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'A Better Dashboard',
		single_column: true
	});
	new frappe.views.BetterDashboard(page);
}
frappe.pages['better-dash'].refresh = function (wrapper) {
	new frappe.views.BetterDashboard(page);
}

frappe.views.BetterDashboard = Class.extend({
	init: function(page) {
		this.page = page;
		this.data = undefined;
		this.args = undefined;
		this.page.show_menu();
		this.add_menu_buttons();
		this.get_data();
		this.render_filters_template();
		this.make_filters();
		this.render_base_template();
		this.make_context_menu();
		this.set_linked_docs_action();
		this.set_secondary_action();
		this.make_custom_actions();
	},
	get_data: function () {
		var me = this;
		frappe.call({
			method: "better_dash.better_dash.page.better_dash.better_dash.get_all_data",
			args: me.args,
			async: false,
			callback: function (r) {
				me.data = r.message;
			}
		});
	},
	render_filters_template: function () {
		var me = this;
		$("#filter-tab").remove();
		me.page.body.prepend(frappe.render_template("dash_filters", { "data": me.data }));		
	},
	render_base_template: function () {
		var me = this;
		console.log(me.data);	
		$(me.page.body).find("#dash-body-main").remove();
		me.page.body.append(frappe.render_template("dash_layout", { "data": me.data }));
		me.list_actions();
	},
	list_actions: function () {
		var me = this;
		$(".list-action").click(function () {
			var id = $(this).attr('id');
			var action = id.substr(3);
			id = id.substring(0,2);
			var id_mapper = {
							"so": {"div": ".gaps.sales-order", "doctype": "Sales Order"},
							"mr": {"div": ".gaps.material-request", "doctype": "Material Request"},
							"po": {"div": ".gaps.purchase-order", "doctype": "Purchase Order"},
							"pr": {"div": ".gaps.purchase-receipt", "doctype": "Purchase Receipt"},
							"dn": {"div": ".gaps.delivery-note", "doctype": "Delivery Note"},
							"si": {"div": ".gaps.sales-invoice", "doctype": "Sales Invoice"}
							}

			var selected_docs = [];
			var selected_doctype = id_mapper[id].doctype;
			$(id_mapper[id].div).find("input:checked").each(function() {
				selected_docs.push($(this).attr('data-name'));
			});
			console.log(selected_docs);
			if (["submit", "cancel", "update"].includes(action)) {
				frappe.confirm(__(action.charAt(0).toUpperCase() + action.slice(1)+" Checked Documents ??"), function() {
					frappe.call({
						method: "frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs",
						args:{
							"doctype": selected_doctype,
							"action": action,
							"docnames": selected_docs
						},
						callback: function (r) {
							let failed = r.message;
							if (!failed) failed = [];
			
							if (failed.length && !r._server_messages) {
								cur_page.page.refresh();
								frappe.throw(__('Cannot {0} {1}', [action, failed.map(f => f.bold()).join(', ')]));
								
							}
							if (failed.length < selected_docs.length) {
								frappe.utils.play_sound(action);
								cur_page.page.refresh();			
							}
						}
					});		
				}, function () {
					cur_page.page.refresh();
				});
			} 
			else if (["delete"].includes(action)){
				frappe.confirm(__(action.charAt(0).toUpperCase() + action.slice(1)+" Checked Documents ??"), function() {
					frappe
					.call({
						method: 'frappe.desk.reportview.delete_items',
						freeze: true,
						args: {
							items: selected_docs,
							doctype: selected_doctype
						},
						callback: function (r) {
							var failed = r.message;
							if (!failed) { failed = []; }
		
							if (failed.length && !r._server_messages) {
								cur_page.page.refresh();
								frappe.throw(__('Cannot delete {0}', [failed.map(function (f) { return f.bold(); }).join(', ')]));
								
							}
							if (failed.length < selected_docs.length) {
								frappe.utils.play_sound('delete');
								cur_page.page.refresh();
							}
						}
					});	
				}, function () {
					cur_page.page.refresh();
				});
			}
			else if (["print"].includes(action)) {

				// print(docs) {
				// 	const print_settings = frappe.model.get_doc(':Print Settings', 'Print Settings');
				// 	const allow_print_for_draft = cint(print_settings.allow_print_for_draft);
				// 	const is_submittable = frappe.model.is_submittable(this.doctype);
				// 	const allow_print_for_cancelled = cint(print_settings.allow_print_for_cancelled);
			
				// 	const valid_docs = docs.filter(doc => {
				// 		return !is_submittable || doc.docstatus === 1 ||
				// 			(allow_print_for_cancelled && doc.docstatus == 2) ||
				// 			(allow_print_for_draft && doc.docstatus == 0) ||
				// 			frappe.user.has_role('Administrator');
				// 	}).map(doc => doc.name);
			
				// 	const invalid_docs = docs.filter(doc => !valid_docs.includes(doc.name));
			
				// 	if (invalid_docs.length > 0) {
				// 		frappe.msgprint(__('You selected Draft or Cancelled documents'));
				// 		return;
				// 	}
			
				// 	if (valid_docs.length > 0) {
				// 		const dialog = new frappe.ui.Dialog({
				// 			title: __('Print Documents'),
				// 			fields: [{
				// 				'fieldtype': 'Check',
				// 				'label': __('With Letterhead'),
				// 				'fieldname': 'with_letterhead'
				// 			},
				// 			{
				// 				'fieldtype': 'Select',
				// 				'label': __('Print Format'),
				// 				'fieldname': 'print_sel',
				// 				options: frappe.meta.get_print_formats(this.doctype)
				// 			}]
				// 		});
			
				// 		dialog.set_primary_action(__('Print'), args => {
				// 			if (!args) return;
				// 			const default_print_format = frappe.get_meta(this.doctype).default_print_format;
				// 			const with_letterhead = args.with_letterhead ? 1 : 0;
				// 			const print_format = args.print_sel ? args.print_sel : default_print_format;
				// 			const json_string = JSON.stringify(valid_docs);
			
				// 			const w = window.open('/api/method/frappe.utils.print_format.download_multi_pdf?' +
				// 				'doctype=' + encodeURIComponent(this.doctype) +
				// 				'&name=' + encodeURIComponent(json_string) +
				// 				'&format=' + encodeURIComponent(print_format) +
				// 				'&no_letterhead=' + (with_letterhead ? '0' : '1'));
				// 			if (!w) {
				// 				frappe.msgprint(__('Please enable pop-ups'));
				// 				return;
				// 			}
				// 		});
			
				// 		dialog.show();
				// 	} else {
				// 		frappe.msgprint(__('Select atleast 1 record for printing'));
				// 	}
				// }				
				
			}			

		});
	},
	make_filters: function () {
		var me = this;
		page = me.page;
		this.date_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'DateRange',
				label: 'Date Range',
				fieldname: 'date_field',
				onchange: () => {
					console.log(this.date_field.get_value());
					me.get_filtered_data();
				}
			},
			parent: $(page.body.html).find('#date-filter'),
			render_input: true
		});
		this.dash_type = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Select',
				label: 'Dashboard Type',
				fieldname: 'dashboard_type',
				options: ["Sales", "Purchase", "General"],
				onchange: () => {
					console.log(this.dash_type.get_value());
					var type = this.dash_type.get_value();
					if (type == "Sales") {
						// me.dash_type = "Sales";
						// cur_page.page.refresh();

						$(".gap.material-request").hide();
						$(".gaps.material-request").hide();
						$(".gap.purchase-order").hide();
						$(".gaps.purchase-order").hide();

						$(".gap.sales-order").show();
						$(".gaps.sales-order").show();
						$(".gap.purchase-receipt").show();
						$(".gaps.purchase-receipt").show();
						$(".gap.delivery-note").show();
						$(".gaps.delivery-note").show();
						$(".gap.sales-invoice").show();
						$(".gaps.sales-invoice").show();						

						$(".gap.sales-order").removeClass("col-xs-2");
						$(".gaps.sales-order").removeClass("col-xs-2");
						$(".gap.purchase-receipt").removeClass("col-xs-2");
						$(".gaps.purchase-receipt").removeClass("col-xs-2");
						$(".gap.delivery-note").removeClass("col-xs-2");
						$(".gaps.delivery-note").removeClass("col-xs-2");
						$(".gap.sales-invoice").removeClass("col-xs-2");
						$(".gaps.sales-invoice").removeClass("col-xs-2");

						$(".gap.sales-order").addClass("col-xs-3");
						$(".gaps.sales-order").addClass("col-xs-3");
						$(".gap.purchase-receipt").addClass("col-xs-3");
						$(".gaps.purchase-receipt").addClass("col-xs-3");
						$(".gap.delivery-note").addClass("col-xs-3");
						$(".gaps.delivery-note").addClass("col-xs-3");
						$(".gap.sales-invoice").addClass("col-xs-3");
						$(".gaps.sales-invoice").addClass("col-xs-3");						
						
					} else if (type == "Purchase") {
						// me.dash_type = "Purchase";

						// cur_page.page.refresh();
						$(".gap.delivery-note").hide();
						$(".gaps.delivery-note").hide();
						$(".gap.sales-invoice").hide();
						$(".gaps.sales-invoice").hide();

						$(".gap.sales-order").show();
						$(".gap.material-request").show();
						$(".gap.purchase-order").show();
						$(".gap.purchase-receipt").show();

						$(".gaps.sales-order").show();
						$(".gaps.material-request").show();
						$(".gaps.purchase-order").show();
						$(".gaps.purchase-receipt").show();

						
						$(".gap.sales-order").removeClass("col-xs-2");
						$(".gaps.sales-order").removeClass("col-xs-2");
						$(".gap.material-request").removeClass("col-xs-2");
						$(".gaps.material-request").removeClass("col-xs-2");
						$(".gap.purchase-order").removeClass("col-xs-2");
						$(".gaps.purchase-order").removeClass("col-xs-2");
						$(".gap.purchase-receipt").removeClass("col-xs-2");
						$(".gaps.purchase-receipt").removeClass("col-xs-2");

						$(".gap.sales-order").addClass("col-xs-3");
						$(".gaps.sales-order").addClass("col-xs-3");
						$(".gap.material-request").addClass("col-xs-3");
						$(".gaps.material-request").addClass("col-xs-3");
						$(".gap.purchase-order").addClass("col-xs-3");
						$(".gaps.purchase-order").addClass("col-xs-3");
						$(".gap.purchase-receipt").addClass("col-xs-3");
						$(".gaps.purchase-receipt").addClass("col-xs-3");	
						
					} else {
						cur_page.page.refresh();
						var from_date = me.date_field.get_value()[0]
						var to_date = me.date_field.get_value()[1]
						me.get_filtered_data(from_date=from_date, to_date=to_date, type=type);
					}
				}
			},
			parent: $(page.body.html).find('#to-date-filter'),
			render_input: true
		});
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
	},
	make_context_menu: function () {
		var me = this;
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
				background: "#FFFFFF"
			});
			return false;
		});

		$('html').click(function () {
			$contextMenu.hide();
		});		
	},
	set_linked_docs_action: function () {
		var me = this;
		$("#highlight_linked").click(function () {
			$(".panel-heading").css("background-color", "#f7fafc");
			var doctype = $(this).parent().parent().parent().attr("data-doctype");
			var docname = $(this).parent().parent().parent().attr("data-name");
			$("[data-doctype='" + doctype + "'][data-name='" + docname + "']").find(".panel-heading")[0].scrollIntoView();
			$("[data-doctype='" + doctype + "'][data-name='" + docname + "']").find(".panel-heading").css("background-color", "#6ebfa9");
			me.get_linked_data(doctype, docname);					
		});

		$("#opendoc").click(function () {
			var doctype = $(this).parent().parent().parent().attr("data-doctype");
			var docname = $(this).parent().parent().parent().attr("data-name");
			window.open('desk#Form/'+doctype+'/'+docname, '_blank');
		});
	},
	get_linked_data: function (doctype, docname) {

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
						console.log(r.message)
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
		
	},
	get_filtered_data: function (from_date=null, to_date=null, type=null) {
		var me = this;
		if (from_date && to_date) {
			me.args = {"from_date": from_date, "to_date": to_date}
		} else {
			me.args = {"from_date": me.date_field.get_value()[0], "to_date": me.date_field.get_value()[1]}	
		}
		
		me.get_data();
		me.render_base_template();
		me.make_context_menu();
		me.set_linked_docs_action();
		if (type) {

			if (type == "Sales") {
				// me.dash_type = "Sales";
				// cur_page.page.refresh();

				$(".gap.material-request").hide();
				$(".gaps.material-request").hide();
				$(".gap.purchase-order").hide();
				$(".gaps.purchase-order").hide();

				$(".gap.sales-order").removeClass("col-xs-2");
				$(".gaps.sales-order").removeClass("col-xs-2");
				$(".gap.purchase-receipt").removeClass("col-xs-2");
				$(".gaps.purchase-receipt").removeClass("col-xs-2");
				$(".gap.delivery-note").removeClass("col-xs-2");
				$(".gaps.delivery-note").removeClass("col-xs-2");
				$(".gap.sales-invoice").removeClass("col-xs-2");
				$(".gaps.sales-invoice").removeClass("col-xs-2");

				$(".gap.sales-order").addClass("col-xs-3");
				$(".gaps.sales-order").addClass("col-xs-3");
				$(".gap.purchase-receipt").addClass("col-xs-3");
				$(".gaps.purchase-receipt").addClass("col-xs-3");
				$(".gap.delivery-note").addClass("col-xs-3");
				$(".gaps.delivery-note").addClass("col-xs-3");
				$(".gap.sales-invoice").addClass("col-xs-3");
				$(".gaps.sales-invoice").addClass("col-xs-3");						
				
			} else if (type == "Purchase") {
				// me.dash_type = "Purchase";

				// cur_page.page.refresh();
				$(".gap.delivery-note").hide();
				$(".gaps.delivery-note").hide();
				$(".gap.sales-invoice").hide();
				$(".gaps.sales-invoice").hide();

				$(".gap.sales-order").removeClass("col-xs-2");
				$(".gaps.sales-order").removeClass("col-xs-2");
				$(".gap.material-request").removeClass("col-xs-2");
				$(".gaps.material-request").removeClass("col-xs-2");
				$(".gap.purchase-order").removeClass("col-xs-2");
				$(".gaps.purchase-order").removeClass("col-xs-2");
				$(".gap.purchase-receipt").removeClass("col-xs-2");
				$(".gaps.purchase-receipt").removeClass("col-xs-2");

				$(".gap.sales-order").addClass("col-xs-3");
				$(".gaps.sales-order").addClass("col-xs-3");
				$(".gap.material-request").addClass("col-xs-3");
				$(".gaps.material-request").addClass("col-xs-3");
				$(".gap.purchase-order").addClass("col-xs-3");
				$(".gaps.purchase-order").addClass("col-xs-3");
				$(".gap.purchase-receipt").addClass("col-xs-3");
				$(".gaps.purchase-receipt").addClass("col-xs-3");	
				
			}			
			
		}
	},
	add_menu_buttons: function () {
		var me = this;
		me.page.add_menu_item(__("Reset Filters"), function() {
			me.reset_filters();
		});
		me.page.add_menu_item(__("Reset All Data"), function() {
			me.reset_data();
		});
	},
	reset_filters: function () {
		var me = this;	
		$("#filter-tab").remove();
		me.render_filters_template();
		me.make_filters();
	},
	reset_data: function () {
		var me = this;
		me.args = undefined;
		me.get_data();
		me.render_base_template();
		me.make_context_menu();
		me.set_linked_docs_action();		
	},
	set_secondary_action() {
		var me = this;
		me.page.set_secondary_action(__("Refresh"), function() {
			me.reset_data();
		}, null, __("Please Wait..."))
	},
	make_custom_actions: function () {
		var me = this;
		me.page.add_menu_item(__("Make Purchase Order"), function() {
			frappe.confirm(__("Please Select Material Requests to Create a Purchase Order"), function() {
				$(".gaps:not(.gaps.material-request)").find("input").attr("disabled", true);
				$(".gaps.material-request").find("input[data-type!='Purchase'][data-doctype='Material Request']").attr("disabled", true);
				$(".gaps.material-request").find("input[data-status='Stopped']").attr("disabled", true);
				$(".gaps.material-request").find("input[data-isprocessed='1']").attr("disabled", true);
				$(".gaps.material-request").find("input[data-docstatus='2'][data-docstatus='0']").attr("disabled", true);
				$(".gaps.material-request").find("input[data-per_ordered='100']").attr("disabled", true);

				me.page.set_primary_action(__("Select Material Requests"), function() {
					$(".gaps").find("input").removeAttr("disabled");
					$(me.page.btn_primary).hide();
					var selected_mrs = [];
					$(".gaps.material-request").find("input:checked").each(function() {
						selected_mrs.push($(this).attr('data-name'));
					});
					frappe.confirm(__("You have selected "+String(selected_mrs)), function() {
						var callback1 = function (){
							var state1 = $("#myModal").find('[data-step="1"]');
							$(state1).find('#supplier-field').empty();
							$(state1).find('#warehouse-field').empty();
							$(state1).find('#schedule-date-field').empty();
							$(state1).find('#taxes-field').empty();
							me.supplier = frappe.ui.form.make_control({
								df: {
									fieldtype: 'Link',
									label: 'Supplier',
									fieldname: 'supplier',
									options: 'Supplier',
									onchange: () => {
									}
								},
								parent: $(state1).find('#supplier-field'),
								render_input: true
							});
							me.warehouse = frappe.ui.form.make_control({
								df: {
									fieldtype: 'Link',
									label: 'Set Target Warehouse',
									fieldname: 'target_warehouse',
									options: 'Warehouse',
									onchange: () => {
									}
								},
								parent: $(state1).find('#warehouse-field'),
								render_input: true
							});
							me.schedule_date = frappe.ui.form.make_control({
								df: {
									fieldtype: 'Date',
									label: 'Schedule Date',
									fieldname: 'schedule_date',
									onchange: () => {
									}
								},
								parent: $(state1).find('#schedule-date-field'),
								render_input: true
							});
							me.tax = frappe.ui.form.make_control({
								df: {
									fieldtype: 'Link',
									label: 'Taxes and Charges Template',
									fieldname: 'tax',
									options: 'Sales Taxes and Charges Template',
									onchange: () => {
									}
								},
								parent: $(state1).find('#taxes-field'),
								render_input: true
							});
						};

						var callback2 = function () {
							var state2 = $("#myModal").find('[data-step="2"]');
							var supplier = me.supplier.get_value();
							var warehouse = me.warehouse.get_value();
							var schedule_date = me.schedule_date.get_value();
							var tax = me.tax.get_value();
							frappe.call({
								method: "better_dash.better_dash.page.better_dash.better_dash.get_po_doc",
								args: {
									"selected_mrs": selected_mrs,
									"supplier": supplier,
									"warehouse": warehouse,
									"schedule_date": schedule_date,
									"tax": tax,
									"method": "erpnext.stock.doctype.material_request.material_request.make_purchase_order"
								},
								callback: function (r) {
									console.log(r.message);
									me.data1 = [];
									$(state2).find('#preview-field').empty();
									me.po_items = frappe.ui.form.make_control({
										df:	{
											fieldname: "items", 
											fieldtype: "Table", 
											in_place_edit: true, 
											fields: 
											[
												{
													label: 'Item Code',
													fieldname: 'item_code',
													fieldtype: 'Link',
													options: 'Item',
													in_list_view: 1,
													columns: 3
												},
												{
													label: 'Quantity',
													fieldname: 'qty',
													fieldtype: 'Float',
													in_list_view: 1,
													columns: 1
												},
												{
													label: 'Rate',
													fieldname: 'rate',
													fieldtype: 'Currency',
													in_list_view: 1,
													columns: 2
												},
												{
													label: 'Amount',
													fieldname: 'amount',
													fieldtype: 'Currency',
													in_list_view: 1,
													columns: 2
												}
											],
											data: r.message.items,
											get_data: () => {
												return r.message.items;
											},
										},
										parent: $(state2).find('#preview-field'),
										render_input: true
									});
								}
							})
						};

						var callback3 = function (){
							var state3 = $("#myModal").find('[data-step="3"]');
							var supplier = me.supplier.get_value();
							var warehouse = me.warehouse.get_value();
							var schedule_date = me.schedule_date.get_value();
							var tax = me.tax.get_value();
							// var items = me.po_items.get_data();
							frappe.call({
								method: "better_dash.better_dash.page.better_dash.better_dash.get_po_doc",
								args: {
									"selected_mrs": selected_mrs,
									"supplier": supplier,
									"warehouse": warehouse,
									"schedule_date": schedule_date,
									"tax": tax,
									"save_action": true,
									// "new_items": items,
									"method": "erpnext.stock.doctype.material_request.material_request.make_purchase_order"
								},
								callback: function (r) {
									console.log(r.message);
									$(state3).find('#route-field').empty();
									me.route = frappe.ui.form.make_control({
										df: {
											fieldtype: 'Button',
											label: r.message.name,
											fieldname: 'route',
											click: () => {
												frappe.set_route('Form', r.message.doctype, r.message.name);
											}
										},
										parent: $(state3).find('#route-field'),
										render_input: true
									});
								}
							})


						};
						
						$('#myModal').modalSteps({
							callbacks: {
								'1': callback1,
								'2': callback2,
								'3': callback3
							},
							completeCallback: function () {
								cur_page.page.refresh();
							}
						});						
						$(cur_dialog.header).find(".btn-primary").attr({"data-toggle":"modal", "data-target":"#myModal"});
								

					}, function() {
						$(".gaps").find("input").prop('checked', false);
						frappe.msgprint("Cancelled")
					});
				}, null, __("Please Wait..."))
			}, function () {
				$(".gaps").find("input").removeAttr("disabled");
				frappe.msgprint("Cancelled");
			});
		});
		me.page.add_menu_item(__("Make Delivery Notes"), function() {
			frappe.confirm(__("Please Select Sales Orders to Create a Delivery Note"), 
			function() {
				$(".gaps:not(.gaps.sales-order)").find("input").attr("disabled", true);
				me.page.set_primary_action(__("Select Sales Orders"), 
				function() {
					var selected_so = [];
					$(".gaps.sales-order").find("input:checked").each(function() {
						selected_so.push($(this).attr('data-name'));
					});
					frappe.confirm(__("Please Select Purchase Receipts against which you want these delivery notes"), 
					function() {
						me.page.set_primary_action(__("Select Purchase Receipts"), function() {
							var selected_pr = [];
							$(".gaps.purchase-receipt").find("input:checked").each(function() {
								selected_pr.push($(this).attr('data-name'));
							});
							console.log(selected_so, selected_pr);
							var dn_data = undefined;
							var callback1 = function () {
								frappe.call({
									method: "better_dash.better_dash.page.better_dash.better_dash.get_data_for_delivery_note",
									args: {
										sales_orders: selected_so,
										purchase_reciepts: selected_pr
									},
									async: false,
									callback: function (r) {
										console.log(r.message)
										dn_data = r.message;
										$("#saor").html(frappe.render_template("make_dn_so", {"data": r.message}));
										$("#pure").html(frappe.render_template("make_dn_pr", {"data": r.message}));
										$("#deno").html(frappe.render_template("make_dn_dn", {"data": r.message}));
										
										$(".adn").click(function() {
											$("#dn_table").find("tr").removeClass("active");
											$(this).parent().parent().addClass("active");
											var a = $(this).parent().parent().attr("data-itemcode");
											frappe.call({
												"method": "better_dash.better_dash.page.better_dash.better_dash.get_item_data",
												'args': {
													'item': a,
													"selected_pr": selected_pr,
													"sales_orders": selected_so
												},
												callback: function (r) {
													// $("#example").css("display", "block");
													$("#av_qty").text(" : "+r.message.bin.actual_qty)
													$("#av_free_qty").text(" : "+r.message.free_bin.actual_qty)
													$("#item_name").text(r.message.item);
													$("#item_data").empty();
													$("#tot_ord_qty").empty();
													$("#tot_ord_qty").text(" : "+r.message.ordered_qty);
													$("#tot_rec_qty").empty();
													$("#tot_rec_qty").text(" : "+r.message.recieved_qty);


													for (let index = 0; index < r.message.ordered_by.length; index++) {
														const element = r.message.ordered_by[index];
														$("#item_data").append(`
														<l1 class="list-group-item">`+element.customer+` ordered `+element.qty+` nos.</li>
														`);
													}
													
													$(".batch_data").empty();
													for(var y=0; y<r.message.batch.length; y++){
														let data = r.message.batch[y];
														$(".batch_data").append(`<tr>
														<td class="batch">`+data.batch_id+`</td>
														<td>`+data.virtual_ware+`</td>
														<td>`+data.stores_ware+`</td>
														<td>`+data.free_ware+`</td>
														<td>`+data.pts+`</td>
														<td>`+data.ptr+`</td>
														<td>`+data.mrp_+`</td>
														<td>`+data.expiry_date+`</td>
														<td align='center'><button class="btn btn-default" id="select_batch" type="button" style="width:100%">Select!</button></td>
														</tr>`)
													}

													$("#select_batch").click(function () {
														console.log(this);
														var val = $(this).parent().parent().find(".batch").text();
														$("#dn_table").find("tr.active").find(".adn.dn-batch").val(val);
														
													});

													console.log(r.message)
												}
											})
										});

										$(".dn_save").click(function () {
											var me = this;
											var data_array = [];
											var rows = $(this).parent().parent().parent().parent();
											
											for(var i=0; i<$(rows).find(".dn_table").find("tr").length; i++){
												var a = $(rows).find(".dn_table").find("tr")[i];
												data_array.push({
													"item_code": $(a).data('itemcode'),
													"bill_qty": $(a).find(".dn-qty").val(),
													"free_qty": $(a).find(".dn-fqty").val(),
													"dis": $(a).find(".dn-dp").val(),
													"batch": $(a).find(".dn-batch").val()
												})
											}

											console.log(data_array)
											

											frappe.call({
												method: "better_dash.better_dash.page.better_dash.better_dash.save_dn",
												args: {
													path: $(this).attr('data-number'),
													data: dn_data,
													new_data: data_array
												},
												callback: function (r) {
													console.log(r.message);
													// frappe.set_route("Delivery Note", r.message);
													$(me).text("Saved");
													$(me).removeClass("btn-success");
													$(me).addClass("btn-secondary");
													$(me).parent().parent().parent().find(".dn_edit").removeClass("hidden");
													// $(me).parent().parent().parent().find(".dn_edit").text(r.message);
													$(me).parent().parent().parent().find(".dn_edit").click(function () {
														window.open('desk#Form/Delivery Note/'+r.message, '_blank')
													});
													
												}
											})
										});
									}
								});
							};
							$('#myModal1').modalSteps({
								callbacks: {
									'1': callback1
								},
								completeCallback: function () {
									cur_page.page.refresh();
								}
							});
							$('#myModal1').modal('show');
							$(this).remove();
						});
						$(".gaps").find("input").removeAttr("disabled");
						$(".gaps:not(.gaps.purchase-receipt)").find("input").attr("disabled", true);
					}, function () {
						$(".gaps").find("input").removeAttr("disabled");
						frappe.msgprint("Cancelled");
					});
				});
			}, function () {
				$(".gaps").find("input").removeAttr("disabled");
				frappe.msgprint("Cancelled");
			});
		});
		me.page.add_menu_item(__("Make Sales Invoices"), function() {


			frappe.confirm(__("Please Select Delivery Notes to Create Sales Inoives"), function() {
				$(".gaps:not(.gaps.delivery-note)").find("input").attr("disabled", true);
				me.page.set_primary_action(__("Select Delivery Notes"), function() {
					$(".gaps").find("input").removeAttr("disabled");
					$(me.page.btn_primary).hide();
					var selected_dn = [];
					$(".gaps.delivery-note").find("input:checked").each(function() {
						selected_dn.push($(this).attr('data-name'));
					});
					frappe.call({
						method: "better_dash.better_dash.page.better_dash.better_dash.make_sales_invoices",
						args: {
							sales_invoices: selected_dn
						},
						callback: function (r) {
							console.log(r.message);
							cur_page.page.refresh();
						}
					});
				});
			
			}, function () {
					$(".gaps").find("input").removeAttr("disabled");
					frappe.msgprint("Cancelled");
				}
			);
			
			

		});

	}
});	