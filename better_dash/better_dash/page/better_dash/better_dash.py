from __future__ import unicode_literals
import frappe
from frappe.utils import cint, cstr
from frappe import throw, _
from frappe.desk.form.linked_with import get_linked_docs, get_linked_doctypes
from frappe.utils.dateutils import parse_date
from frappe.utils import getdate, nowdate
from frappe.utils import cstr, flt, getdate, comma_and, cint, nowdate, add_days
from frappe.model.mapper import map_docs
from erpnext.controllers.accounts_controller import get_taxes_and_charges

@frappe.whitelist()
def get_all_data(date=None):
    if date:
        filter = {"creation": ["between", [getdate(parse_date(date)), getdate(parse_date(date))]]}
    else:
        filter = {}   
    sales_order = frappe.db.get_list("Sales Order", fields=["name", "customer", "status"], filters=filter)
    for i in sales_order:
        items = frappe.db.get_list("Sales Order Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer[0:20]
    material_req = frappe.db.get_list("Material Request", fields=["name", "customer_name", "status", "material_request_type"], filters=filter)
    for i in material_req:
        items = frappe.db.get_list("Material Request Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "uom"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer_name[0:20]
    purchase_ord = frappe.db.get_list("Purchase Order", fields=["name", "supplier", "status"], filters=filter)
    for i in purchase_ord:
        items = frappe.db.get_list("Purchase Order Item", filters={"parent": i.name}, fields=["item_code", "item_name", "qty", "rate", "amount", "uom"])
        i.items = items
        i.item_count = len(items)
        i.title = i.supplier[0:20]
    purchase_rec = frappe.db.get_list("Purchase Receipt", fields=["name", "supplier", "status"], filters=filter)
    for i in purchase_rec:
        items = frappe.db.get_list("Purchase Receipt Item", filters={"parent": i.name}, fields=["item_code", "item_name"])
        i.items = items
        i.item_count = len(items)
        i.title = i.supplier[0:20]
    delivery_note = frappe.db.get_list("Delivery Note", fields=["name", "customer", "status"], filters=filter)
    for i in delivery_note:
        items = frappe.db.get_list("Delivery Note Item", filters={"parent": i.name}, fields=["item_code", "item_name"])
        i.items = items
        i.item_count = len(items)
        i.title = i.customer[0:20]
    sales_invoice = frappe.db.get_list("Sales Invoice", fields=["name", "customer", "status"], filters=filter)
    for i in sales_invoice:
        items = frappe.db.get_list("Sales Invoice Item", filters={"parent": i.name}, fields=["item_code", "item_name"])
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
                "sales_invoice_count": len(sales_invoice)
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
        new_doc.insert()
    return new_doc

