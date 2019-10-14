from __future__ import unicode_literals
import frappe
from frappe.utils import cint, cstr
from frappe import throw, _
from frappe.desk.form.linked_with import get_linked_docs, get_linked_doctypes
from frappe.utils.dateutils import parse_date
from frappe.utils import getdate, nowdate
from frappe.utils import cstr, flt, getdate, comma_and, cint, nowdate, add_days
from frappe.model.mapper import map_docs
from frappe.model.mapper import make_mapped_doc
from erpnext.controllers.accounts_controller import get_taxes_and_charges
import json
from erpnext.stock.doctype.batch.batch import get_batch_qty

global_defaults = frappe.get_doc("Global Defaults")
company = global_defaults.default_company
found_company = frappe.get_doc("Company",{"name":company})
company_abbr = found_company.abbr
medleydist_id = found_company.medley_dist_id
proxy_settings = frappe.get_doc("Proxy Setting")
if proxy_settings.site_mode == "Production" :
	ip =  proxy_settings.production_ip
else:
	ip =  proxy_settings.development_ip
ware = proxy_settings.virtual_warehouse
default_ware = proxy_settings.default_warehouse
free_warehouse = proxy_settings.free_quantity_warehouse
del_notes = None
@frappe.whitelist()
def get_all_data(from_date=nowdate(),to_date=nowdate()):
    if from_date:
        filter = {"creation": ["between", [getdate(parse_date(from_date)), getdate(parse_date(to_date))]]}
    else:
        filter = {}   
    sales_order = frappe.db.get_list("Sales Order", fields=["name", "customer", "status", "medley_orderid"], filters=filter)
    for i in sales_order:
        items = frappe.db.get_list("Sales Order Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer[0:20]
    material_req = frappe.db.get_list("Material Request", fields=["name", "customer_name", "status", "material_request_type", "title", "docstatus", "is_processed", "per_ordered", "medleyorderid"], filters=filter)
    for i in material_req:
        items = frappe.db.get_list("Material Request Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "uom"])
        i.items = items
        i.item_count = len(items)
        if i.title:
            i.title = i.title[0:20]
        else:
            i.title = ""
    purchase_ord = frappe.db.get_list("Purchase Order", fields=["name", "supplier", "status"], filters=filter)
    for i in purchase_ord:
        items = frappe.db.get_list("Purchase Order Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount", "uom"])
        i.items = items
        i.item_count = len(items)
        i.title = i.supplier[0:20]
    purchase_rec = frappe.db.get_list("Purchase Receipt", fields=["name", "supplier", "status", "medley_master_orderid"], filters=filter)
    for i in purchase_rec:
        items = frappe.db.get_list("Purchase Receipt Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount", "free_qty", "batch_no"])
        i.items = items
        i.item_count = len(items)
        i.title = i.supplier[0:20]
    delivery_note = frappe.db.get_list("Delivery Note", fields=["name", "customer", "status", "medley_orderid"], filters=filter)
    for i in delivery_note:
        items = frappe.db.get_list("Delivery Note Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount", "free_qty", "batch_no", "expiry_date"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer[0:20]
    sales_invoice = frappe.db.get_list("Sales Invoice", fields=["name", "customer", "status", "medley_orderid"], filters=filter)
    for i in sales_invoice:
        items = frappe.db.get_list("Sales Invoice Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount", "free_qty", "batch_no", "expiry_date"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer[0:20]
    return {
                "sales_order": sales_order,
                "material_req": material_req,
                "purchase_ord": purchase_ord,
                "purchase_rec": purchase_rec,
                "delivery_note": delivery_note,
                "sales_invoice": sales_invoice,
                "sales_order_count": len(sales_order),
                "material_req_count": len(material_req),
                "purchase_ord_count": len(purchase_ord),
                "purchase_rec_count": len(purchase_rec),
                "delivery_note_count": len(delivery_note),
                "sales_invoice_count": len(sales_invoice),
                "warehouse": ware,
                "ware": ware, "default_ware": default_ware, "free_warehouse": free_warehouse
            }

@frappe.whitelist()
def get_po_doc(selected_mrs, method, supplier, warehouse, schedule_date, tax, save_action=None, new_items=None):
    doc = frappe.new_doc("Purchase Order")
    doc.supplier = supplier
    doc.set_warehouse = warehouse
    doc.taxes_and_charges = tax
    doc.transaction_date = frappe.utils.add_days(nowdate(), 0)
    doc.schedule_date = frappe.utils.add_days(nowdate(), 7)

    new_doc = map_docs(source_names=selected_mrs, target_doc=doc, method=method)
    new_doc.transaction_date = frappe.utils.add_days(nowdate(), 0)
    new_doc.schedule_date = frappe.utils.add_days(nowdate(), 7)
    # new_doc.items = new_items
    for items in new_doc.items:
        items.schedule_date = frappe.utils.add_days(nowdate(), 0)
    taxes = get_taxes_and_charges('Sales Taxes and Charges Template', "In State GST - C")
    for tax in taxes:
        new_doc.append('taxes', tax)
    if save_action:
        data = json.loads(new_items)
        new_doc.items = []
        for i in data['items']:
            if "sales_order" in i.keys(): 
                new_doc.append("items", {
                            "item_code": i['item_code'],
                            "schedule_date": frappe.utils.add_days(nowdate(), 7),
                            "qty": i['qty'],
                            "sales_order": i['sales_order'],
                            "material_request": i['material_request'],
                            "material_request_item": i['material_request_item']
                        })
            else:
                new_doc.append("items", {
                            "item_code": i['item_code'],
                            "schedule_date": frappe.utils.add_days(nowdate(), 7),
                            "qty": i['qty']
                        })
        new_doc.set_missing_values()
        new_doc.insert()
        return new_doc

    return new_doc

@frappe.whitelist()
def get_data_for_delivery_note(sales_orders, purchase_reciepts):
    SO = []
    PR = []
    DN = []
    method = "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note"

    for x in json.loads(sales_orders):
        salesorder = frappe.get_doc("Sales Order", x)
        SO.append(salesorder)
        new_doc = make_mapped_doc(source_name=salesorder.name, method=method)
        DN.append(new_doc)
    for y in json.loads(purchase_reciepts):
        purchasereciept = frappe.get_doc("Purchase Receipt", y)
        PR.append(purchasereciept)   
    del_notes = DN
    return {"SO": SO, "PR": PR, "DN": DN}    


@frappe.whitelist()
def get_item_data(item, selected_pr, sales_orders):
    bin = []
    free_bin = []
    bin_name = frappe.db.get_value("Bin", filters={"warehouse": ware, "item_code": item}, fieldname="name")
    free_bin_name = frappe.db.get_value("Bin", filters={"warehouse": free_warehouse, "item_code": item}, fieldname="name")
    if bin_name:
        bin = frappe.db.get_all("Bin",
		filters={"name": bin_name},
		fields=["actual_qty", "reserved_qty"])[0]
    if free_bin_name:
        free_bin = frappe.db.get_all("Bin",
		filters={"name": free_bin_name},
		fields=["actual_qty", "reserved_qty"])[0]

    purchase_order_item = []
    purchase_reciept_item = []
    selected_pr = json.loads(selected_pr)
    for i in selected_pr:
        po_name = frappe.db.get_value("Purchase Receipt", i, "purchase_order_no")
        purchase_reciept = frappe.db.get_list("Purchase Receipt Item", fields=["name", "qty", "item_code"], filters={"parent": i, "item_code": item}) 
        purchase_order = frappe.db.get_list("Purchase Order Item", fields=["name", "qty", "item_code"], filters={"parent": po_name, "item_code": item})    
        for i in purchase_order:
            purchase_order_item.append(i)
        for i in purchase_reciept:
            purchase_reciept_item.append(i)

    ordered_qty = 0
    for b in purchase_order_item:
        ordered_qty += b.qty

    recieved_qty = 0
    for b in purchase_reciept_item:
        recieved_qty += b.qty

    batch = frappe.db.get_list("Batch", filters={"item": item}, fields=["batch_id", "name", "pts", "ptr", "mrp_", "expiry_date"])
    for ko in batch:
        ko.virtual_ware = get_batch_qty(batch_no=ko.batch_id, warehouse=ware, item_code=item)
        ko.stores_ware = get_batch_qty(batch_no=ko.batch_id, warehouse=default_ware, item_code=item)
        ko.free_ware = get_batch_qty(batch_no=ko.batch_id, warehouse=free_warehouse, item_code=item)
    
    ordered_by = []

    for x in json.loads(sales_orders):
        salesorder = frappe.get_doc("Sales Order", x)    
        for i in salesorder.items:
            if i.item_code == item:
                ordered_by.append({"customer":salesorder.customer, "qty": i.qty})

    return {"bin":bin, "free_bin": free_bin, 
            "purchase_order_item":purchase_order_item, "batch": batch, 
            "ware": ware, "default_ware": default_ware, 
            "free_warehouse": free_warehouse, "ordered_by": ordered_by, 
            "item": frappe.db.get_value("Item", item, "item_name"),
            "ordered_qty": ordered_qty, "recieved_qty": recieved_qty}

@frappe.whitelist()
def save_dn(path, data, new_data):
    data = json.loads(data)
    a = frappe.get_doc(data['DN'][int(path)])
    new_data = json.loads(new_data)
    # for i in new_data:
    #     for j in a.items:
    #         if i['item_code'] == j.item_code:
    #             j.qty = i['bill_qty']
    #             j.free_qty = i['free_qty']
    #             j.discount_percentage = i['dis']
    #             j.batch_no = i['batch']

    # a.taxes_and_charges = "In State GST - "+company_abbr
    # taxes = get_taxes_and_charges('Sales Taxes and Charges Template', a.taxes_and_charges)
    # for tax in taxes:
    #     a.append('taxes', tax)
    # a.insert()
    # frappe.db.commit()
    # print(a.name)
    return new_data

@frappe.whitelist()
def make_sales_invoices(sales_invoices):
    method = "erpnext.stock.doctype.delivery_note.delivery_note.make_sales_invoice"
    invoices = []
    sales_invoices = json.loads(sales_invoices)
    for i in sales_invoices:
        new_doc = make_mapped_doc(source_name=i, method=method)
        new_doc.insert()
        invoices.append(new_doc.name)

    return invoices
    