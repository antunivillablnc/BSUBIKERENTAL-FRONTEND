"use client";

import { useMemo, useState } from "react";

type Msg = { role: "user" | "bot"; text: string };

type KBItem = {
	id: string;
	q: string;
	a: string;
	keywords: string[];
};

type FaqBotProps = {
	onEscalate?: (payload: { question: string; transcript: string }) => void;
	variant?: "inline" | "floating";
};

// Source of truth copied from Help Center FAQ (page.tsx lines 24-173)
const FAQ_RAW: { id: string; q: string; a: string }[] = [
	{ id: "1", q: "How do I register for the bike rental system?", a: "To register, click on the \"Register\" button on the homepage and fill out the registration form with your information. You'll need to provide your email, and other required details. Once submitted, your application will be reviewed by the admin team." },
	{ id: "2", q: "How long does the application approval process take?", a: "Application approval typically takes 1-3 business days. You'll receive an notification on the app once your application has been reviewed. You can also check your application status in your dashboard." },
	{ id: "3", q: "What documents do I need to register?", a: "You need a Certificate of Indigency, General Weighted Average, Extra Curricular Activities, and Income Tax Return." },
	{ id: "4", q: "Can I register if I'm not a current student?", a: "The bike rental system is exclusively for current students, teacher and staff of the university." },
	{ id: "5", q: "How do I rent a bike?", a: "Once your application is approved, your bike will be assigned to you and you can pick it up from SDO CECS building." },
	{ id: "6", q: "Can I rent multiple bikes at once?", a: "No, each student can only rent one bike at a time. This policy ensures that bikes are available for as many students as possible." },
	{ id: "7", q: "How do I cancel my rent?", a: "You can cancel a rent through returning the bike to the same location where you picked it up." },
	{ id: "8", q: "Where can I pick up and return bikes?", a: "Bikes can be picked up and returned at SDO CECS building. Always return bikes to the same location where you picked them up." },
	{ id: "9", q: "What are the operating hours for bike pickup and return?", a: "Bikes can be picked up and returned during campus hours, typically from 7:00 AM to 4:00 PM." },
	{ id: "10", q: "What should I do if a bike is damaged or not working?", a: "If you encounter a damaged or non-functional bike, please report it immediately through the \"Report Issue\" feature in your \"Help Center\" or contact the staff. Do not attempt to use a damaged bike as it may be unsafe." },
	{ id: "11", q: "What if I lose or damage a bike during my rental?", a: "Report any loss or damage immediately to the staff. You may be responsible for repair costs or replacement fees. Contact support as soon as possible to discuss the situation." },
	{ id: "12", q: "How do I report a technical issue with the system?", a: "Use the \"Report Issue\" feature in your \"Help Center\" or contact support directly. Provide as much detail as possible about the problem you're experiencing." },
	{ id: "13", q: "Can I extend my rental period?", a: "No, you cannot extend your rental period because the bike is assigned to you for a specific period you may apply again for a new application." },
	{ id: "14", q: "What happens if I return a bike late?", a: "Late returns may result in penalties or temporary suspension of rental privileges. The system tracks rental periods automatically. Please try to return bikes on time to maintain good standing." },
	{ id: "15", q: "What safety equipment is provided with bikes?", a: "Each bike comes with a helmet and basic safety equipment. Helmets are mandatory for all riders. Additional safety gear may be available like tumbler and air pump at pickup locations." },
	{ id: "16", q: "Are there any safety rules I need to follow?", a: "Yes, you must wear a helmet at all times, follow traffic rules, and ride responsibly. No riding under the influence of alcohol or drugs. Always check the bike before riding." },
	{ id: "17", q: "What should I do in case of an accident?", a: "In case of an accident, prioritize your safety first. Contact emergency services if needed, then report the incident to the bike rental staff immediately. Do not leave the scene without proper documentation." },
	{ id: "18", q: "Is there a mobile app available?", a: "Currently, the bike rental system is accessible through the web interface, which is mobile-responsive. A dedicated mobile app may be available in the future. The web version works well on smartphones and tablets." },
	{ id: "19", q: "What browsers are supported?", a: "The system works best with modern browsers including Chrome, Firefox, Safari, and Edge. Make sure your browser is updated to the latest version for the best experience." },
	{ id: "20", q: "What if I forget my password?", a: "Use the \"Forgot Password\" link on the login page to reset your password. You'll receive an email with instructions to create a new password." },
	{ id: "21", q: "How do I update my profile information?", a: "You can update your profile information through the \"Profile Settings\" section in your dashboard." },
	{ id: "22", q: "Can I change my email address?", a: "Yes, you can update your email address in your profile settings." },
	{ id: "23", q: "How do I deactivate my account?", a: "Contact support to request account deactivation. Make sure to return any active rentals and clear any outstanding issues before deactivation." },
	{ id: "24", q: "How do I contact support?", a: "You can contact support through the phone number (09694567890) or email (sdobsulipa@g.batstate-u.edu.ph) provided in the contact section. Response times are typically within 24 hours during business days." },
	{ id: "25", q: "What are the support hours?", a: "Support is available during business hours, Monday through Friday, 8:00 AM to 5:00 PM. For urgent issues outside these hours, use the emergency contact number." },
];

const STOPWORDS = new Set([
	"a","an","the","and","or","to","of","for","in","on","at","is","are","am","can","i","you","we","they","with","do","does","my","your","our","what","how","where","if","there","any","be","from","it","this","that","as","may",
]);

function deriveKeywords(question: string): string[] {
	const base = question
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 2 && !STOPWORDS.has(w));
	const set = new Set(base);
	// Light synonyms to improve recall
	if (set.has("apply") || set.has("application")) ["apply", "application", "register"].forEach((w) => set.add(w));
	if (set.has("hours") || set.has("hour")) ["hours", "time", "open", "close", "schedule"].forEach((w) => set.add(w));
	if (set.has("location") || set.has("pick") || set.has("return"))
		["location", "where", "address", "map", "pickup", "return"].forEach((w) => set.add(w));
	if (set.has("report") || set.has("issue") || set.has("damaged"))
		["report", "issue", "problem", "broken", "maintenance", "technical"].forEach((w) => set.add(w));
	if (set.has("safety")) ["safety", "helmet", "rules"].forEach((w) => set.add(w));
	if (set.has("support") || set.has("contact")) ["support", "contact", "email", "phone", "help"].forEach((w) => set.add(w));
	return Array.from(set);
}

const KB: KBItem[] = FAQ_RAW.map((f) => ({
	id: f.id,
	q: f.q,
	a: f.a,
	keywords: deriveKeywords(f.q),
}));

function score(input: string, item: KBItem) {
	const s = input.toLowerCase();
	let hits = 0;
	for (const k of item.keywords) {
		if (s.includes(k)) hits++;
	}
	if (s.includes(item.q.toLowerCase())) hits += 2;
	return hits;
}

function findAnswer(input: string) {
	let best: { item: KBItem; score: number } | null = null;
	for (const item of KB) {
		const sc = score(input, item);
		if (!best || sc > best.score) best = { item, score: sc };
	}
	return best && best.score > 0 ? best.item.a : null;
}

export default function FaqBot({ onEscalate, variant = "inline" }: FaqBotProps) {
	const [messages, setMessages] = useState<Msg[]>([
		{ role: "bot", text: "Hi! I’m here to help. Ask a question or use the quick actions below." },
	]);
	const [input, setInput] = useState("");
	const [open, setOpen] = useState(true);

	const transcript = useMemo(
		() => messages.map((m) => `${m.role === "user" ? "You" : "Bot"}: ${m.text}`).join("\n"),
		[messages]
	);

	function submit() {
		const q = input.trim();
		if (!q) return;
		const answer = findAnswer(q);
		const next: Msg[] = [{ role: "user", text: q }];
		if (answer) {
			next.push({ role: "bot", text: answer });
		} else {
			next.push({
				role: "bot",
				text: "I don't have that in my FAQs. You can report this to the team so we can help.",
			});
			next.push({
				role: "bot",
				text: "[Report Issue]",
			});
		}
		setMessages((m) => [...m, ...next]);
		setInput("");
	}

	const showReportButton =
		messages.length >= 2 && messages[messages.length - 1].text === "[Report Issue]";

	const containerStyle: React.CSSProperties =
		variant === "floating"
			? {
					position: "fixed",
					right: 16,
					bottom: 16,
					zIndex: 1100,
					width: 420,
					maxWidth: "92vw",
					border: "1px solid var(--border-color)",
					borderRadius: 18,
					background: "var(--card-bg)",
					boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
			  }
			: {
					width: "100%",
					maxWidth: 560,
					border: "1px solid var(--border-color)",
					borderRadius: 12,
					background: "var(--card-bg)",
			  };

	function quickAsk(q: string) {
		setInput(q);
		setTimeout(() => {
			setInput(q);
			// trigger send
			const answer = findAnswer(q);
			const next: Msg[] = [{ role: "user", text: q }];
			if (answer) {
				next.push({ role: "bot", text: answer });
			} else {
				next.push({
					role: "bot",
					text: "I don't have that in my FAQs. You can report this to the team so we can help.",
				});
				next.push({ role: "bot", text: "[Report Issue]" });
			}
			setMessages((m) => [...m, ...next]);
			setInput("");
		}, 0);
	}

	return (
		<div style={containerStyle}>
			{/* Header (click to collapse/expand) */}
			<button
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				style={{
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					padding: "12px 14px",
					background: "linear-gradient(180deg, rgba(25,118,210,0.12), rgba(25,118,210,0.06))",
					border: "none",
					borderBottom: "1px solid var(--border-color)",
					borderTopLeftRadius: 12,
					borderTopRightRadius: 12,
					cursor: "pointer",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<div
						aria-hidden="true"
						style={{
							width: 30,
							height: 30,
							borderRadius: "50%",
							background: "#2563eb",
							color: "#ffffff",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontWeight: 800,
						}}
					>
						{/* headset icon */}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M12 1a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h3v-6H6v-4a6 6 0 0 1 12 0v4h-3v6h3a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9Z" />
						</svg>
					</div>
					<div style={{ textAlign: "left" }}>
						<div style={{ fontWeight: 800, color: "var(--text-primary)" }}>Chat Support</div>
						<div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
							Click to {open ? "collapse" : "expand"}
						</div>
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--text-muted)"
						strokeWidth="2"
						style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
						aria-hidden="true"
					>
						<path d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</button>

			{/* Body */}
			{open && (
				<div style={{ padding: 16 }}>
					{/* Greeting + Quick actions when fresh */}
					{messages.length <= 1 && (
						<div
							style={{
								background: "var(--bg-tertiary)",
								border: "1px solid var(--border-color)",
								borderRadius: 14,
								padding: 16,
								marginBottom: 14,
							}}
						>
							<div style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
								<div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, fontSize: 16 }}>
									Hello! You’re chatting with the Support chatbot.
								</div>
								<div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Automated replies • Not a live agent</div>
								<div style={{ fontSize: 14 }}>How can we help you today?</div>
							</div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 10,
								}}
							>
								<button
									onClick={() => quickAsk("Report an issue")}
									style={{
										borderRadius: 999,
										padding: "12px 14px",
										border: "1px solid var(--border-color)",
										background: "var(--bg-primary)",
										color: "var(--text-primary)",
										cursor: "pointer",
										fontWeight: 700,
										boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
									}}
								>
									Report an Issue
								</button>
								<button
									onClick={() => quickAsk("Where is the office located?")}
									style={{
										borderRadius: 999,
										padding: "12px 14px",
										border: "1px solid var(--border-color)",
										background: "var(--bg-primary)",
										color: "var(--text-primary)",
										cursor: "pointer",
										fontWeight: 700,
										boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
									}}
								>
									Office Location
								</button>
								<button
									onClick={() => quickAsk("What are the office hours?")}
									style={{
										borderRadius: 999,
										padding: "12px 14px",
										border: "1px solid var(--border-color)",
										background: "var(--bg-primary)",
										color: "var(--text-primary)",
										cursor: "pointer",
										fontWeight: 700,
										boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
									}}
								>
									Office Hours
								</button>
								<button
									onClick={() => quickAsk("How do I apply?")}
									style={{
										borderRadius: 999,
										padding: "12px 14px",
										border: "1px solid var(--border-color)",
										background: "var(--bg-primary)",
										color: "var(--text-primary)",
										cursor: "pointer",
										fontWeight: 700,
										boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
									}}
								>
									How to Apply
								</button>
							</div>
						</div>
					)}

					<div style={{ marginBottom: 14, maxHeight: 360, overflow: "auto", display: "grid", gap: 10, paddingRight: 4 }}>
						{messages.map((m, i) => (
							<div key={i} style={{ textAlign: m.role === "user" ? "right" : "left" }}>
								<span
									style={{
										display: "inline-block",
										borderRadius: 12,
										padding: "10px 14px",
										background: m.role === "user" ? "#2563eb" : "var(--bg-tertiary)",
										color: m.role === "user" ? "#ffffff" : "var(--text-primary)",
										boxShadow: m.role === "user" ? "0 6px 18px rgba(37,99,235,0.25)" : "0 6px 18px rgba(0,0,0,0.08)",
										lineHeight: 1.5,
									}}
								>
									{m.text}
								</span>
							</div>
						))}
					</div>
					{/* Input with search icon left and send arrow right */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr auto",
							gap: 10,
							alignItems: "center",
						}}
					>
						<div style={{ position: "relative" }}>
							<input
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && submit()}
								placeholder="How can I help?"
								style={{
									width: "100%",
									border: "1px solid var(--border-color)",
									borderRadius: 999,
									padding: "12px 44px 12px 40px",
									background: "var(--bg-primary)",
									color: "var(--text-primary)",
									outline: "none",
									boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
								}}
							/>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2"
								style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
								aria-hidden="true"
							>
								<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<button
							onClick={submit}
							aria-label="Send"
							style={{
								borderRadius: 999,
								width: 42,
								height: 42,
								background: "#2563eb",
								color: "#ffffff",
								border: "none",
								fontWeight: 700,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								boxShadow: "0 10px 22px rgba(37,99,235,0.35)",
							}}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M22 2L11 13" />
								<path d="M22 2l-7 20-4-9-9-4 20-7z" />
							</svg>
						</button>
					</div>
					{showReportButton && (
						<div style={{ marginTop: 10 }}>
							<button
								onClick={() => {
									const lastQ = [...messages].reverse().find((m) => m.role === "user")?.text || "";
									onEscalate?.({
										question: lastQ,
										transcript: transcript + (lastQ ? `\nYou: ${lastQ}` : ""),
									});
								}}
								style={{
									borderRadius: 8,
									padding: "10px 12px",
									background: "#dc2626",
									color: "#ffffff",
									border: "none",
									fontWeight: 700,
									cursor: "pointer",
								}}
							>
								Report Issue
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}


