<script setup lang="ts">
useHead({
	title: 'Datenschutz – AdvancedZeugnis',
})
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<header
			class="sticky top-0 z-10 border-b border-default bg-default/95 backdrop-blur supports-backdrop-filter:bg-default/80"
		>
			<UContainer class="flex h-14 items-center justify-between">
				<ULink
					to="/"
					class="flex items-center gap-2 font-semibold text-highlighted"
				>
					<UIcon
						name="i-lucide-graduation-cap"
						class="size-6 text-primary"
					/>
					AdvancedZeugnis
				</ULink>
				<UButton
					to="/sign-in"
					label="Anmelden"
					trailing-icon="i-lucide-arrow-right"
				/>
			</UContainer>
		</header>

		<main class="flex-1 py-12">
			<UContainer class="max-w-2xl">
				<h1 class="text-3xl font-semibold text-highlighted mb-2">
					Datenschutzerklärung
				</h1>
				<p class="text-sm text-muted mb-8">
					Stand: Juni 2026
				</p>

				<div class="space-y-8 text-default">
					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							1. Verantwortlicher
						</h2>
						<p class="text-muted">
							Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
						</p>
						<p class="mt-3">
							Benedikt Bornemann<br>
							An den Sieben Gäßchen 23<br>
							58636 Iserlohn<br>
							Deutschland<br>
							E-Mail:
							<ULink
								to="mailto:benedikt.bornemann@gmail.com"
								class="text-primary hover:underline"
							>
								benedikt.bornemann@gmail.com
							</ULink>
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							2. Geltungsbereich
						</h2>
						<p class="text-muted">
							Diese Datenschutzerklärung informiert über die Verarbeitung personenbezogener Daten bei der Nutzung der Website und Webanwendung AdvancedZeugnis. Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.
						</p>
						<p class="text-muted mt-3">
							AdvancedZeugnis richtet sich an Lehrkräfte und Schulen zur Verwaltung von Schülerdaten, Vorlagen und Zeugnistexten. Es werden keine Werbe- oder Analyse-Cookies eingesetzt und kein Nutzertracking zu Marketingzwecken betrieben.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							3. Bereitstellung der Website
						</h2>
						<p class="text-muted">
							Beim Aufruf dieser Website werden technisch notwendige Daten über Ihre Internetverbindung verarbeitet, etwa IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene Seiten, Browsertyp und Betriebssystem. Diese Verarbeitung erfolgt, um die Website auszuliefern, die Stabilität und Sicherheit zu gewährleisten und Missbrauch abzuwehren.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionsfähigen Webauftritt). Die Übertragung erfolgt verschlüsselt per HTTPS/TLS.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							4. Registrierung, Anmeldung und Nutzerkonto
						</h2>
						<p class="text-muted">
							Für die Nutzung der Anwendung ist ein Benutzerkonto erforderlich. Dabei verarbeite ich insbesondere:
						</p>
						<ul class="list-disc pl-5 mt-3 space-y-1 text-muted">
							<li>E-Mail-Adresse</li>
							<li>Passwort (ausschließlich in gehashter Form gespeichert)</li>
							<li>optional Anzeigename</li>
							<li>Schulzugehörigkeit, Rolle und Einladungsdaten bei Nutzung im Schulteam</li>
							<li>Authentifizierungs- und Sitzungsinformationen</li>
						</ul>
						<p class="text-muted mt-3">
							Zur Anmeldung können E-Mail und Passwort, ein Magic Link per E-Mail oder ein Passwort-Zurücksetzen per E-Mail genutzt werden. Hierfür versende ich transaktionale E-Mails mit Bestätigungs- oder Anmeldecodes.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. vorvertragliche Maßnahmen auf Ihre Anfrage hin).
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Speicherdauer:</strong> Kontodaten werden gespeichert, solange Ihr Benutzerkonto besteht. Sie können Ihr Konto in den Kontoeinstellungen löschen; anschließend werden die zugehörigen Serverdaten entfernt, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							5. Schülerdaten in der Anwendung
						</h2>
						<p class="text-muted">
							Schülerstammdaten und Zeugnisauswahlen (z. B. Vorname, Nachname, Geschlecht, gewählte Formulierungen) werden <strong class="text-default">lokal in Ihrem Browser</strong> in IndexedDB gespeichert. Diese Schülerdaten werden von AdvancedZeugnis <strong class="text-default">nicht auf meinen Servern gespeichert</strong>.
						</p>
						<p class="text-muted mt-3">
							Sie sind als Nutzerin oder Nutzer dafür verantwortlich, dass die Verarbeitung von Schülerdaten im Rahmen Ihrer schulischen Tätigkeit rechtmäßig erfolgt, insbesondere wenn Sie personenbezogene Daten Minderjähriger verarbeiten.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von Ihnen genutzten Anwendungsfunktionen). Für Schülerdaten können zusätzlich schulrechtliche Pflichten oder Einwilligungen der Erziehungsberechtigten bzw. schulische Zuständigkeiten gelten.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Speicherdauer:</strong> Die lokalen Schülerdaten verbleiben auf Ihrem Endgerät, bis Sie sie in der Anwendung löschen oder Ihren Browser-Speicher für diese Website zurücksetzen.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							6. Vorlagen und Schuldaten auf dem Server
						</h2>
						<p class="text-muted">
							Wenn Sie AdvancedZeugnis im Schulteam nutzen, werden Vorlagen, Schulnamen, Mitgliedschaften, Einladungen und zugehörige Metadaten auf meinem Backend-Server gespeichert. Einladungen enthalten die E-Mail-Adresse der eingeladenen Person sowie die gewählte Rolle.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Speicherdauer:</strong> bis zur Löschung des Benutzerkontos, der Schule oder des jeweiligen Datensatzes, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							7. Speicherung im Browser (localStorage und IndexedDB)
						</h2>
						<p class="text-muted">
							AdvancedZeugnis speichert Informationen auf Ihrem Endgerät, um die Anwendung bereitzustellen:
						</p>
						<ul class="list-disc pl-5 mt-3 space-y-1 text-muted">
							<li><strong class="text-default">localStorage:</strong> Authentifizierungs-Token zur Aufrechterhaltung Ihrer Anmeldung</li>
							<li><strong class="text-default">IndexedDB:</strong> Schülerdaten und lokal zwischengespeicherte Anwendungsdaten</li>
						</ul>
						<p class="text-muted mt-3">
							Diese Speicherungen sind technisch erforderlich, um den von Ihnen ausdrücklich gewünschten Dienst bereitzustellen. Es werden keine optionalen Tracking- oder Marketing-Cookies eingesetzt.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> § 25 Abs. 2 Nr. 2 TDDDG in Verbindung mit Art. 6 Abs. 1 lit. b DSGVO.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							8. Optionale Textverbesserung im Browser
						</h2>
						<p class="text-muted">
							AdvancedZeugnis kann optional eine im Browser verfügbare KI-Funktion (Chrome Rewriter API) nutzen, um Formulierungen in Zeugnistexten zu verbessern. Diese Verarbeitung erfolgt, sofern Ihr Browser die Funktion unterstützt, <strong class="text-default">lokal auf Ihrem Gerät</strong>. Die Texte werden dabei nicht von mir an einen externen KI-Dienst gesendet.
						</p>
						<p class="text-muted mt-3">
							<strong class="text-default">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Nutzung der Funktion), soweit erforderlich, sowie Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung der gewünschten Funktion.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							9. Einsatz von Dienstleistern (Auftragsverarbeitung)
						</h2>
						<p class="text-muted">
							Für den Betrieb der Anwendung setze ich spezialisierte Dienstleister ein, die personenbezogene Daten in meinem Auftrag verarbeiten:
						</p>
						<div class="mt-4 space-y-4 text-muted">
							<div>
								<p class="font-medium text-default">
									Convex, Inc.
								</p>
								<p>
									Backend-Hosting, Datenbank und Authentifizierung. Je nach Konfiguration kann die Verarbeitung in der EU (z. B. Irland) oder den USA erfolgen.
								</p>
								<p class="mt-1">
									Weitere Informationen:
									<ULink
										to="https://www.convex.dev/legal/privacy"
										target="_blank"
										class="text-primary hover:underline"
									>
										convex.dev/legal/privacy
									</ULink>
								</p>
							</div>
							<div>
								<p class="font-medium text-default">
									Resend (Plus Five Five, Inc.)
								</p>
								<p>
									Versand transaktionaler E-Mails (Anmeldung, Bestätigung, Passwort-Zurücksetzen). Verarbeitung u. a. in den USA.
								</p>
								<p class="mt-1">
									Weitere Informationen:
									<ULink
										to="https://resend.com/legal/privacy-policy"
										target="_blank"
										class="text-primary hover:underline"
									>
										resend.com/legal/privacy-policy
									</ULink>
								</p>
							</div>
						</div>
						<p class="text-muted mt-4">
							Mit diesen Dienstleistern bestehen die nach Art. 28 DSGVO erforderlichen Vereinbarungen zur Auftragsverarbeitung bzw. entsprechende Standardvertragsklauseln für Übermittlungen in Drittländer.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							10. Übermittlung in Drittländer
						</h2>
						<p class="text-muted">
							Bei der Nutzung der genannten Dienstleister kann eine Übermittlung personenbezogener Daten in Länder außerhalb der Europäischen Union, insbesondere die USA, erfolgen. Die Übermittlung erfolgt auf Grundlage geeigneter Garantien im Sinne von Art. 46 DSGVO, insbesondere Standardvertragsklauseln der Europäischen Kommission und, soweit anwendbar, Zertifizierungen nach dem EU-US Data Privacy Framework.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							11. Ihre Rechte
						</h2>
						<p class="text-muted">
							Sie haben gegenüber mir folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:
						</p>
						<ul class="list-disc pl-5 mt-3 space-y-1 text-muted">
							<li>Auskunft (Art. 15 DSGVO)</li>
							<li>Berichtigung (Art. 16 DSGVO)</li>
							<li>Löschung (Art. 17 DSGVO)</li>
							<li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
							<li>Datenübertragbarkeit (Art. 20 DSGVO), soweit anwendbar</li>
							<li>Widerspruch gegen Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO)</li>
							<li>Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO) mit Wirkung für die Zukunft</li>
						</ul>
						<p class="text-muted mt-3">
							Zur Ausübung Ihrer Rechte genügt eine Nachricht an
							<ULink
								to="mailto:benedikt.bornemann@gmail.com"
								class="text-primary hover:underline"
							>
								benedikt.bornemann@gmail.com
							</ULink>.
							Sie können Ihr Benutzerkonto zudem in den Kontoeinstellungen der Anwendung löschen.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							12. Beschwerderecht bei einer Aufsichtsbehörde
						</h2>
						<p class="text-muted">
							Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren. Zuständige Aufsichtsbehörde für Nordrhein-Westfalen ist:
						</p>
						<p class="mt-3 text-muted">
							Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen<br>
							Kavalleriestraße 2–4<br>
							40213 Düsseldorf<br>
							<ULink
								to="https://www.ldi.nrw.de"
								target="_blank"
								class="text-primary hover:underline"
							>
								www.ldi.nrw.de
							</ULink>
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							13. Pflicht zur Bereitstellung von Daten
						</h2>
						<p class="text-muted">
							Die Bereitstellung personenbezogener Daten ist für die Registrierung und Nutzung von AdvancedZeugnis erforderlich. Ohne diese Daten kann die Anwendung nicht im vorgesehenen Umfang bereitgestellt werden.
						</p>
					</section>

					<section>
						<h2 class="text-lg font-semibold text-highlighted mb-2">
							14. Änderungen dieser Datenschutzerklärung
						</h2>
						<p class="text-muted">
							Ich behalte mir vor, diese Datenschutzerklärung anzupassen, wenn sich die Anwendung, eingesetzte Dienstleister oder die Rechtslage ändern. Die jeweils aktuelle Fassung ist auf dieser Seite abrufbar.
						</p>
					</section>
				</div>

				<div class="mt-10">
					<UButton
						to="/"
						label="Zurück zur Startseite"
						variant="outline"
						color="neutral"
						icon="i-lucide-arrow-left"
					/>
				</div>
			</UContainer>
		</main>
	</div>
</template>
