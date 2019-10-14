$(document).on('page-change', function(e) {
	if (frappe.get_route_str() == "better-dash") {
		// $(".main-sidebar").hide();
		$("#body_div").attr('style', 'margin-left: 0px !important');
	} else {
		// $(".main-sidebar").show();
		$("#body_div").attr('style', 'margin-left: 50px !important');
	}
	
});
$(document).ready(function () {
	$(".dropdown-menu#toolbar-user").append("<li><a id='start-togetherjs'>Seek Help !</a></li>");
	$("#start-togetherjs").click(TogetherJS);
});