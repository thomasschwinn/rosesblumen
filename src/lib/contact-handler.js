import { Resend } from "resend";

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
}[character]));

const redirect = (status) => new Response(null, {
	status: 303,
	headers: {
		Location: `/?contact=${status}#kontakt`,
		"Cache-Control": "no-store",
	},
});

export async function handleContact(request) {
	if (request.method !== "POST") {
		return new Response("Method not allowed", {
			status: 405,
			headers: { Allow: "POST" },
		});
	}

	let form;
	try {
		form = await request.formData();
	} catch {
		return redirect("error");
	}

	const value = (key) => {
		const entry = form.get(key);
		return typeof entry === "string" ? entry.trim() : "";
	};
	const name = value("name");
	const email = value("email");
	const message = value("message");

	if (form.get("company")) return redirect("success");
	if (
		name.length < 2 || name.length > 80 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
		message.length < 5 || message.length > 5000
	) return redirect("error");

	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM_EMAIL;
	const to = process.env.CONTACT_TO_EMAIL || "hallo@rosesblumen.com";
	if (!apiKey || !from || !to) return redirect("error");

	const safeName = escapeHtml(name);
	const safeEmail = escapeHtml(email);
	const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

	try {
		const resend = new Resend(apiKey);
		const { error } = await resend.emails.send({
			from,
			to: [to],
			replyTo: email,
			subject: `Contact request from ${name}`,
			text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
			html: `<h2>New contact request</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p>${safeMessage}</p>`,
		});
		if (error) console.error("Resend contact email failed:", error.message);
		return redirect(error ? "error" : "success");
	} catch (error) {
		console.error("Contact form send failed:", error instanceof Error ? error.message : "Unknown error");
		return redirect("error");
	}
}
