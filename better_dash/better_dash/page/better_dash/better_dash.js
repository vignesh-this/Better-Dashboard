frappe.pages['better-dash'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'A Better Dashboard',
		single_column: true
	});
	// new frappe.views.BetterDashboard(page);
}
frappe.pages['better-dash'].refresh = function (wrapper) {
	new frappe.views.BetterDashboard(wrapper);
}

frappe.views.BetterDashboard = Class.extend({
	init: function (wrapper) {
		var me = this;
		me.wrapper = wrapper;
		me.data = undefined;
		me.args = undefined;
		me.render_layout();
		me.make_filters();
		me.get_data();
		me.render_base_template();
		me.make_custom_actions();
		me.make_context_menu();
		me.list_actions();
		me.set_secondary_action();
	},
	render_layout: function () {
		var me = this;
		$(me.wrapper.page.body).html(frappe.render_template("better_dash"));
	},
	make_filters: function () {
		var me = this;
		$(me.wrapper.page.body).find(".better-dash-filter").html(frappe.render_template("dash_filters"));
		this.date_field = frappe.ui.form.make_control({
			df: {
				fieldtype: 'DateRange',
				label: 'Date Range',
				fieldname: 'date_field',
				onchange: () => {
					if (this.date_field.get_value()) {
						me.get_filtered_data();
						if (this.dash_type.get_value() == "Sales") {
							$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
						} 
						else if (this.dash_type.get_value() == "Purchase"){
							$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
						}
						else{
							$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
						}
						me.make_context_menu();
						me.list_actions();
					}
				}
			},
			parent: $(me.wrapper).find('#date-filter'),
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
					if (this.dash_type.get_value() == "Sales") {
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
					} 
					else if (this.dash_type.get_value() == "Purchase"){
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
					}
					else{
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
					}
					me.make_context_menu();
					me.list_actions();
				}
			},
			parent: $(me.wrapper).find('#to-date-filter'),
			render_input: true
		});
	},
	get_data: function () {
		var me = this;
		frappe.call({
			method: "better_dash.better_dash.page.better_dash.better_dash.get_all_data",
			args: me.args,
			async: false,
			callback: function (r) {
				console.log(r.message);
				me.data = r.message;
			}
		});
	},
	render_base_template: function () {
		var me = this;
		$(me.wrapper.page.body).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
	},
	get_filtered_data: function (from_date=null, to_date=null, type=null) {
		var me = this;
		if (from_date && to_date) {
			me.args = {"from_date": from_date, "to_date": to_date}
		} else {
			me.args = {"from_date": me.date_field.get_value()[0], "to_date": me.date_field.get_value()[1]}	
		}
		me.get_data();
	},
	make_custom_actions: function () {
		var me = this;
		
		me.wrapper.page.add_menu_item(__("Make Purchase Order"),
			function () {
				$('input:checkbox').removeAttr('checked');
				frappe.confirm(__("Please Select Material Requests to Create a Purchase Order"),
					function () {
						$(".gaps:not(.gaps.material-request)").find("input").attr("disabled", true);
						$(".gaps.material-request").find("input[data-type!='Purchase'][data-doctype='Material Request']").attr("disabled", true);
						$(".gaps.material-request").find("input[data-status='Stopped']").attr("disabled", true);
						$(".gaps.material-request").find("input[data-isprocessed='1']").attr("disabled", true);
						$(".gaps.material-request").find("input[data-docstatus='2'][data-docstatus='0']").attr("disabled", true);
						$(".gaps.material-request").find("input[data-per_ordered='100']").attr("disabled", true);
						$(me.wrapper.page.btn_primary).show();
						me.wrapper.page.set_primary_action(__("Select Material Requests"), 
							function() {
								$(me.wrapper.page.btn_primary).hide();
								var selected_mrs = [];
								$(".gaps.material-request").find("input:checked").each(function() {
									selected_mrs.push($(this).attr('data-name'));
								});
								$(".gaps").find("input").removeAttr("disabled");
								$('input:checkbox').removeAttr('checked');
								if (selected_mrs.length > 0) {
									frappe.confirm(__("You have selected "+String(selected_mrs)),
										function () {
											const dialog = new frappe.ui.Dialog({
												title: __("Fill Details For Purchase Orders"),
												fields: [
													{
														fieldtype: 'Link',
														label: 'Supplier',
														fieldname: 'supplier',
														options: 'Supplier',
														reqd: 1,
														onchange: () => {
														}
													},
													{
														fieldtype: 'Link',
														label: 'Set Target Warehouse',
														fieldname: 'target_warehouse',
														options: 'Warehouse',
														reqd: 1,
														onchange: () => {
														}
													},
													{fieldtype:'Column Break'},
													{
														fieldtype: 'Date',
														label: 'Schedule Date',
														fieldname: 'schedule_date',
														reqd: 1,
														onchange: () => {
														}
													},
													{
														fieldtype: 'Link',
														label: 'Taxes and Charges Template',
														fieldname: 'tax',
														options: 'Sales Taxes and Charges Template',
														reqd: 1,
														onchange: () => {
														}
													},
												],
												primary_action: function() {
													this.hide();
													const data = this.get_values();
													frappe.call({
														method: "better_dash.better_dash.page.better_dash.better_dash.get_po_doc",
														args: {
															"selected_mrs": selected_mrs,
															"supplier": data.supplier,
															"warehouse": data.target_warehouse,
															"schedule_date": data.schedule_date,
															"tax": data.tax,
															"method": "erpnext.stock.doctype.material_request.material_request.make_purchase_order"
														},
														callback: function (r) {
															// console.log(r.message);
															const dialog = new frappe.ui.Dialog({
																title: __("Check Purchase Order Items"),
																fields: [
																	{
																		fieldtype: 'Link',
																		label: 'Supplier',
																		fieldname: 'supplier',
																		options: 'Supplier',
																		default: data.supplier,
																		reqd: 1,
																		onchange: () => {
																		}
																	},
																	{
																		fieldtype: 'Link',
																		label: 'Set Target Warehouse',
																		fieldname: 'target_warehouse',
																		options: 'Warehouse',
																		default: data.target_warehouse,
																		reqd: 1,
																		onchange: () => {
																		}
																	},
																	{fieldtype:'Column Break'},
																	{
																		fieldtype: 'Date',
																		label: 'Schedule Date',
																		fieldname: 'schedule_date',
																		default: data.schedule_date,
																		reqd: 1,
																		onchange: () => {
																		}
																	},
																	{
																		fieldtype: 'Link',
																		label: 'Taxes and Charges Template',
																		fieldname: 'tax',
																		options: 'Sales Taxes and Charges Template',
																		reqd: 1,
																		default: data.tax,
																		onchange: () => {
																		}
																	},
																	{fieldtype:'Section Break'},
																	{
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
																				columns: 3,
																				change: function () {
																					console.log(this);
																					var me = this;
																					frappe.call({
																						method: "frappe.client.get_value",
																						args: {
																							doctype: "Item Price",
																							filters: {"item_code": this.get_value(), "price_list": "Standard Buying"},
																							fieldname: "price_list_rate"
																						},
																						callback: function(r){
																							console.log(r.message);
																							me.grid_row.on_grid_fields_dict.rate.set_value(r.message.price_list_rate);
																							if (me.grid_row.on_grid_fields_dict.qty.get_value() == null) {
																								me.grid_row.on_grid_fields_dict.qty.set_value("0");
																							}
																						}
																					});
																				}
																			},
																			{
																				label: 'Quantity',
																				fieldname: 'qty',
																				fieldtype: 'Float',
																				in_list_view: 1,
																				columns: 1,
																				change: function () {
																					var me = this;
																					var rate = parseFloat(me.grid_row.on_grid_fields_dict.rate.get_value());
																					var qty = parseFloat(me.get_value());
																					me.grid_row.on_grid_fields_dict.amount.set_value(String(rate*qty));
																				}
																			},
																			{
																				label: 'Rate',
																				fieldname: 'rate',
																				fieldtype: 'Currency',
																				in_list_view: 1,
																				columns: 2,
																				change: function () {
																					var me = this;
																					var qty = parseFloat(me.grid_row.on_grid_fields_dict.qty.get_value());
																					var rate = parseFloat(me.get_value());
																					me.grid_row.on_grid_fields_dict.amount.set_value(String(rate*qty));
																				}
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
																	}
																],
																primary_action: function() {
																	this.hide();
																	const data = this.get_values();
																	console.log(data);
																	frappe.call({
																		method: "better_dash.better_dash.page.better_dash.better_dash.get_po_doc",
																		args: {
																			"selected_mrs": selected_mrs,
																			"supplier": data.supplier,
																			"warehouse": data.target_warehouse,
																			"schedule_date": data.schedule_date,
																			"tax": data.tax,
																			"save_action": true,
																			"new_items": data,
																			"method": "erpnext.stock.doctype.material_request.material_request.make_purchase_order"
																		},
																		callback: function (r) {
																			frappe.msgprint("Purchase Order Created.");
																			me.get_data();
																			if (me.dash_type.get_value() == "Sales") {
																				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
																			} 
																			else if (me.dash_type.get_value() == "Purchase"){
																				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
																			}
																			else{
																				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
																			}
																			me.make_context_menu();
																			me.list_actions();
																		}
																	});
																},
																primary_action_label: __('Save')
															});	
															dialog.show();
														}
													});
												},
												primary_action_label: __('Update')
											});
											dialog.show();	
										},
										function () {
											frappe.show_alert({message:"Cancelled", indicator:'red'});
										}
									)
								} else {
									frappe.show_alert({message:"No Material Requests Selected.", indicator:'red'});
								}
							}
						);		
					},
					function () {
						frappe.show_alert({message:"Cancelled", indicator:'red'});
					}
				);
			}
		);
		me.wrapper.page.add_menu_item(__("Make Delivery Notes"),
			function () {
				$('input:checkbox').removeAttr('checked');
				frappe.confirm(__("Please Select Sales Orders to Create a Delivery Note"),
					function () {
						$(".gaps:not(.gaps.sales-order)").find("input").attr("disabled", true);
						$(me.wrapper.page.btn_primary).show();
						me.wrapper.page.set_primary_action(__("Select Sales Orders"), 
							function () {
								$(me.wrapper.page.btn_primary).hide();
								var selected_so = [];
								$(".gaps.sales-order").find("input:checked").each(function() {
									selected_so.push($(this).attr('data-name'));
								});
								$(".gaps").find("input").removeAttr("disabled");
								$('input:checkbox').removeAttr('checked');
								if (selected_so.length > 0) {
									
									frappe.confirm(__("Please Select Purchase Receipts against which you want these delivery notes"),
										function () {
											$(".gaps:not(.gaps.purchase-receipt)").find("input").attr("disabled", true);
											$(me.wrapper.page.btn_primary).show();
											me.wrapper.page.set_primary_action(__("Select Purchase Receipts"), 
												function() {
													$(me.wrapper.page.btn_primary).hide();
													var selected_pr = [];
													$(".gaps.purchase-receipt").find("input:checked").each(function() {
														selected_pr.push($(this).attr('data-name'));
													});
													$(".gaps").find("input").removeAttr("disabled");
													$('input:checkbox').removeAttr('checked');
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
																	$("table").find("tr").removeClass("active");
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
																				<td align='center'><button class="btn btn-default select_batch" type="button" style="width:100%">Select!</button></td>
																				</tr>`)
																			}

																			$(".select_batch").click(function () {
																				console.log(this);
																				var val = $(this).parent().parent().find(".batch").text();
																				$("table").find("tr.active").find("input.dn-batch").val(val);
																				
																			});

																			var $contextMenu1 = $("#contextMenu1");
																			$(".dn_row").contextmenu(function (e) {

																				$contextMenu1.css({
																					display: "block",
																					// left: e.pageX,
																					// top: e.pageY - 130,
																					background: "#FFFFFF"
																				});
																				var me = this;
																				$("#split_batch").click(function () {
																					console.log(me);
																				});
																				$("#delete_dn_item").click(function () {
																					console.log(me);
																				});

																				return false;


																			});

																			$('html').click(function () {
																				$contextMenu1.hide();
																			});		
																			
																		}
																	})
																});

																$(".dn_save").click(function () {
																	var me = this;
																	var data_array = [];
																	var rows = $(this).parent().parent().parent().parent();
																	console.log($(rows).find("#dn_table").find("tr"))
																	for(var i=0; i<$(rows).find("#dn_table").find("tr").length; i++){
																		var a = $(rows).find("#dn_table").find("tr")[i];
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
																			$(me).text("Saved");
																			$(me).removeClass("btn-success");
																			$(me).addClass("btn-secondary");
																			$(me).attr("disabled", true);
																			$(me).parent().parent().parent().find(".dn_edit").removeClass("hidden");
																			$(me).parent().parent().parent().find(".dn_edit").text("Open in new tab");																			
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
														}
													});
													$('#myModal1').modal('show');
												}
											);	
										},
										function () {
											frappe.show_alert({message:"Cancelled", indicator:'red'});
										}
									);	

								} else {
									frappe.show_alert({message:"No Sales Orders Were Selected.", indicator:'red'});
								}
							}
						);	
					},
					function () {
						frappe.show_alert({message:"Cancelled", indicator:'red'});
					}
				);	
			}
		);

		
		me.wrapper.page.add_menu_item(__("Make Sales Invoices"), 
			function () {
				$('input:checkbox').removeAttr('checked');
				frappe.confirm(__("Please Select Delivery Notes to Create Sales Inoives"),
					function () {
						$(".gaps:not(.gaps.delivery-note)").find("input").attr("disabled", true);
						$(me.wrapper.page.btn_primary).show();
						me.wrapper.page.set_primary_action(__("Select Delivery Notes"),
							function () {
								$(".gaps").find("input").removeAttr("disabled");
								$(me.wrapper.page.btn_primary).hide();
								var selected_dn = [];
								$(".gaps.delivery-note").find("input:checked").each(function() {
									selected_dn.push($(this).attr('data-name'));
								});
								if (selected_dn.length > 0) {
									frappe.call({
										method: "better_dash.better_dash.page.better_dash.better_dash.make_sales_invoices",
										args: {
											sales_invoices: selected_dn
										},
										callback: function (r) {
											console.log(r.message);
											me.get_data();
											if (me.dash_type.get_value() == "Sales") {
												$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
											} 
											else if (me.dash_type.get_value() == "Purchase"){
												$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
											}
											else{
												$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
											}
											me.make_context_menu();
											me.list_actions();
										}
									});	
								}
								else{
									frappe.show_alert({message:"No Delivery Notes Were Selected.", indicator:'red'});
								}
							}
						)
					},
					function () {
						frappe.show_alert({message:"Cancelled", indicator:'red'});
					}
				)
			}
		);
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
		me.set_linked_docs_action();
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
								me.get_data();
								if (me.dash_type.get_value() == "Sales") {
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
								} 
								else if (me.dash_type.get_value() == "Purchase"){
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
								}
								else{
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
								}
								me.make_context_menu();
								me.list_actions();
								frappe.throw(__('Cannot {0} {1}', [action, failed.map(f => f.bold()).join(', ')]));
								
							}
							if (failed.length < selected_docs.length) {
								frappe.utils.play_sound(action);
								me.get_data();
								if (me.dash_type.get_value() == "Sales") {
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
								} 
								else if (me.dash_type.get_value() == "Purchase"){
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
								}
								else{
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
								}
								me.make_context_menu();
								me.list_actions();			
							}
						}
					});		
				}, function () {
					me.get_data();
					if (me.dash_type.get_value() == "Sales") {
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
					} 
					else if (me.dash_type.get_value() == "Purchase"){
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
					}
					else{
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
					}
					me.make_context_menu();
					me.list_actions();
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
								me.get_data();
								if (me.dash_type.get_value() == "Sales") {
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
								} 
								else if (me.dash_type.get_value() == "Purchase"){
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
								}
								else{
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
								}
								me.make_context_menu();
								me.list_actions();
								frappe.throw(__('Cannot delete {0}', [failed.map(function (f) { return f.bold(); }).join(', ')]));
								
							}
							if (failed.length < selected_docs.length) {
								frappe.utils.play_sound('delete');
								me.get_data();
								if (me.dash_type.get_value() == "Sales") {
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
								} 
								else if (me.dash_type.get_value() == "Purchase"){
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
								}
								else{
									$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
								}
								me.make_context_menu();
								me.list_actions();
							}
						}
					});	
				}, function () {
					me.get_data();
					if (me.dash_type.get_value() == "Sales") {
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
					} 
					else if (me.dash_type.get_value() == "Purchase"){
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
					}
					else{
						$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
					}
					me.make_context_menu();
					me.list_actions();
				});
			}
			else if (["select-all"].includes(action)) {				
				$(id_mapper[id].div).find("input").attr("checked", true);
			}
			else if (["print"].includes(action)) {				
				$(id_mapper[id].div).find("input").attr("checked", true);
			}			

		});
	},
	set_secondary_action() {
		var me = this;
		me.wrapper.page.set_secondary_action(__("Refresh Data"), function() {
			me.get_data();
			if (me.dash_type.get_value() == "Sales") {
				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_sales", {"data": me.data}));
			} 
			else if (me.dash_type.get_value() == "Purchase"){
				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("better_purchase", {"data": me.data}));
			}
			else{
				$(me.wrapper).find(".better-dash-body").html(frappe.render_template("dash_layout", {"data": me.data}));
			}
			me.make_context_menu();
			me.list_actions();
			frappe.show_alert({message:"Data Refreshed", indicator:'green'});
		}, null, __("Please Wait..."))
	},
});
