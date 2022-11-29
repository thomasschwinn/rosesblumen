import Head from "next/head";
import Hero from "../components/hero";
import Navbar from "../components/navbar";
import SectionTitle from "../components/sectionTitle";

import { benefitOne, benefitTwo } from "../components/data";
import Video from "../components/video";
import Benefits from "../components/benefits";
import Footer from "../components/footer";
import Testimonials from "../components/testimonials";
import Cta from "../components/cta";
import Faq from "../components/faq";
import PopupWidget from "../components/popupWidget";

//import dynamic from "next/dynamic";

// const Video = dynamic(() => import("../components/video"));

// const Benefits = dynamic(() => import("../components/benefits"));
// const Footer = dynamic(() => import("../components/footer"));
// const Testimonials = dynamic(() => import("../components/testimonials"));
// const Cta = dynamic(() => import("../components/cta"));
// const Faq = dynamic(() => import("../components/faq"));

// const PopupWidget = dynamic(() => import("../components/popupWidget"));

export default function Home() {
	return (
		<>
			<Head>
				<title>
					Rosesblumen - Frische Schnittblumen am Karmeliter- und am Volkertmarkt
				</title>
				<meta
					name="description"
					content="Rosesblumen ist ein Stand mit frischen Schnittblumen. Freitag und Samstag am Karmelitermarkt und am Mittwoch am Volkertmarkt"
				/>
				<link rel="icon" href="/rosesblumen_favicon.png" />
			</Head>

			<Hero />

			<Footer />
			<PopupWidget />
		</>
	);
}
