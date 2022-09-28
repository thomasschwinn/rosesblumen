function check_the_hcaptcha() {
	const form = document.getElementById("contactformrose");

	form.addEventListener("submit", function (e) {
		const hCaptcha = form.querySelector(
			"textarea[name=h-captcha-response]"
		).value;

		if (!hCaptcha) {
			e.preventDefault();
			alert("Please fill out captcha field");
			return;
		}
	});
	console.log("hallo");
}
