$(document).ready(function() {
	
	$("#dropdown-sortby").change(function() {
		let val = $("#dropdown-sortby option:selected").val();
		$("#all-reviews").html("Loading...");

		// send to server
		$.get(`${document.URL}/${val}`).then(function(d, s) {
			if (s === "success") {
				if (d.length > 0) {
					$("#all-reviews").html(d.data)
				} else {
					$("#all-reviews").html("Nothing found.");
				}
			}
		})
	})
})