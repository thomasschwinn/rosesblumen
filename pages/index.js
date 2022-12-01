import Head from "next/head";
import Hero from "../components/hero";

import Footer from "../components/footer";
import Testimonials from "../components/testimonials";
import Cta from "../components/cta";
import Faq from "../components/faq";
import PopupWidget from "../components/popupWidget";

export default function Home() {
	return (
		<>
			<Head>
				<title>Rosesblumen - Frische Schnittblumen am Karmelitermarkt</title>
				<meta
					name="description"
					content="Rosesblumen ist ein Stand mit frischen Schnittblumen. Freitag und Samstag am Karmelitermarkt"
				/>
				<link rel="icon" href="/rosesblumen_favicon.png" />
			</Head>

			<Hero />

			<Footer />
			<PopupWidget />
		</>
	);
}
