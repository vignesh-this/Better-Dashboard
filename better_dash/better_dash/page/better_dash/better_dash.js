frappe.pages['better-dash'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'A Better Dashboard',
		single_column: true
	});
	new frappe.views.BetterDashboard(page);
}
frappe.pages['better-dash'].refresh = function (wrapper) {

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
				frappe.confirm(__("Submit Checked Documents ??"), function() {
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
								frappe.throw(__('Cannot {0} {1}', [action, failed.map(f => f.bold()).join(', ')]));
							}
							if (failed.length < docnames.length) {
								frappe.utils.play_sound(action);
								if (done) done();
							}
						}
					});		
				});
			} else {
				frappe.throw("Sorry !!!");
			}			

		});
	},
	make_filters: function () {
		var me = this;
		page = me.page;
		this.date_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'Date',
				label: 'Date',
				fieldname: 'date_field',
				onchange: () => {
					console.log(this.date_field.get_value());
					me.get_filtered_data();
				}
			},
			parent: $(page.body.html).find('#date-filter'),
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
	get_filtered_data: function () {
		var me = this;
		me.args = {"date": me.date_field.get_value()}
		me.get_data();
		me.render_base_template();
		me.make_context_menu();
		me.set_linked_docs_action();
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
			frappe.confirm(__("Please Select Sales Orders to Create a Delivery Note"), function() {
				$(".gaps:not(.gaps.sales-order)").find("input").attr("disabled", true);
				me.page.set_primary_action(__("Select Sales Orders"), function() {
					var selected_so = [];
					$(".gaps.sales-order").find("input:checked").each(function() {
						selected_so.push($(this).attr('data-name'));
					});
					frappe.confirm(__("Please Select Purchase Receipts against which you want these delivery notes"), function() {
						// $(me.page.btn_primary).remove();
						me.page.set_primary_action(__("Select Purchase Receipts"), function() {
							var selected_pr = [];
							$(".gaps.purchase-receipt").find("input:checked").each(function() {
								selected_pr.push($(this).attr('data-name'));
							});
							console.log(selected_so, selected_pr)
						});
						$(".gaps").find("input").removeAttr("disabled");
						$(".gaps:not(.gaps.purchase-receipt)").find("input").attr("disabled", true);
					});
				});
			});
		});
		me.page.add_menu_item(__("Make Sales Invoices"), function() {

		});

	}
});	