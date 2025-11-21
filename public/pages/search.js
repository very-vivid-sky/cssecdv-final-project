$(document).ready(function() {
	$("#search").submit(function(e) {
		e.preventDefault(); // disable refresh

		// regex away special characters
		let query = $("#search-value").val();
		query = query.replace(/[^A-Za-z0-9 ]/gm, "");

		// search data
		if (query.length > 0) {
			$.get(`${document.URL}/${ query }`).then(function(d, s) {
				// loading...
				$("#search-results").html("Loading...");

				// when data is obtained...
				if (s === "success") {
					if (d.length > 0) {
						$("#search-results").html(d);
					} else {
						$("#search-results").html("No restaurants found!");
					}
				}
			})
		}
	})
})