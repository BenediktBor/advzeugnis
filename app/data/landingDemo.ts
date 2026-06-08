import type { Student } from '~/types/student'
import type { SentencePart, TemplateSet } from '~/types/template'

export const landingTemplateSet: TemplateSet = {
	"id": "landing-demo-set",
	"label": "Klasse 1 – Demo (Bömberg)",
	"subjects": [
		{
			"id": "4ad48c2a-0e9a-47c2-b8d4-016cceed1f32",
			"label": "Deutsch",
			"categories": [
				{
					"id": "95458392-9634-4c1f-9dda-e1101b8a52b6",
					"label": "Mündlicher Sprachgebrauch",
					"grades": [
						{
							"id": "5e1a88dc-aca5-461f-858d-685b584f5e45",
							"label": "1",
							"variants": [
								{
									"id": "e82a5289-1f3a-45ca-a2f3-65b191ed2af4",
									"label": "1",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "verfügt über einen umfangreichen Wortschatz und formuliert eigene Gesprächsbeiträge anschaulich und wortgewandt."
										},
										{
											"type": "optionalGroup",
											"id": "00ac76f1-e932-46a6-930d-a297ec86d987",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "name"
												},
												{
													"type": "text",
													"value": "trägt den eigenen Standpunkt angemessen vor und begründet diesen."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "2aed5af5-9a2b-4178-8238-ffeee24e5719",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "name"
												},
												{
													"type": "text",
													"value": "kann auf andere Gesprächsbeiträge Bezug nehmen und seinen eigenen Standpunkt begründet darstellen."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "7408d1cf-27e7-4e2c-9ecb-d8ace0dd1024",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "Das Einhalten gemeinsam vereinbarter Gesprächsregeln fällt"
												},
												{
													"type": "genderVariant",
													"value": [
														"ihm",
														"ihr"
													]
												},
												{
													"type": "text",
													"value": "leicht."
												}
											]
										}
									]
								},
								{
									"id": "b03f05ff-0250-40da-a32b-711764356ff9",
									"label": "2",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "verfügt über einen umfangreichen Wortschatz und berichtet nachvollziehbar und zusammenhängend von eigenen Erlebnissen."
										},
										{
											"type": "optionalGroup",
											"id": "3167852a-7b91-4b93-bfaf-170aa5982dd7",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "trägt den eigenen Standpunkt angemessen vor und begründet diesen."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "152a7617-a44f-44fa-8bae-b774ad79c40c",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "kann auf andere Gesprächsbeiträge Bezug nehmen und seinen eigenen Standpunkt begründet darstellen."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "bb42a799-aea8-4a66-947d-500b8ac07807",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "Das Einhalten gemeinsam vereinbarter Gesprächsregeln fällt"
												},
												{
													"type": "genderVariant",
													"value": [
														"ihm",
														"ihr"
													]
												},
												{
													"type": "text",
													"value": "leicht."
												}
											]
										}
									]
								}
							]
						},
						{
							"id": "9638eaea-dcb8-494f-952d-29977cafeb45",
							"label": "4",
							"variants": [
								{
									"id": "07caa233-09e5-4c83-8fe9-c670f14931cf",
									"label": "1",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "verfügt über einen geringen Wortschatz und erzählt nicht immer verständlich in zum Teil unvollständigen Sätzen."
										},
										{
											"type": "text",
											"value": "Es zeigen sich deutliche Schwächen im grammatikalischen Bereich."
										},
										{
											"type": "optionalGroup",
											"id": "2348440b-a12e-409a-97d0-576e9c1937c6",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "muss noch lernen, Gesprächsbeiträge aufmerksamer zu verfolgen, um sich zielgerichteter an Klassengesprächen beteiligen zu können."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "fe5a0be0-2f37-4618-8c9d-96f5e1467dbe",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "muss noch daran arbeiten, die gemeinsam vereinbarten Gesprächsregeln verlässlicher einzuhalten."
												}
											]
										}
									]
								},
								{
									"id": "e8e9b4fe-e8bb-46a9-8f29-880091d5ece0",
									"label": "2",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "ist nicht immer in der Lage, sich sachgerecht und zusammenhängend an Klassengesprächen zu beteiligen."
										},
										{
											"type": "text",
											"value": "Es zeigen sich deutliche Schwächen im grammatikalischen Bereich."
										},
										{
											"type": "optionalGroup",
											"id": "e9a22a7c-0735-4bae-875a-5c9bb4d586dd",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "muss noch lernen, Gesprächsbeiträge aufmerksamer zu verfolgen, um sich zielgerichteter an Klassengesprächen beteiligen zu können."
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "1eb054b2-7594-42fe-a0dc-cac76c6f0f5c",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "genderVariant",
													"value": [
														"Er",
														"Sie"
													]
												},
												{
													"type": "text",
													"value": "muss noch daran arbeiten, die gemeinsam vereinbarten Gesprächsregeln verlässlicher einzuhalten."
												}
											]
										}
									]
								}
							]
						}
					]
				},
				{
					"id": "fc2e937e-1d54-455d-bff9-aeafbb3a5dff",
					"label": "Schriftlicher Sprachgebrauch/Rechtschreiben",
					"grades": [
						{
							"id": "21763bba-169a-4403-b0d6-5edc7e22e3be",
							"label": "1",
							"variants": [
								{
									"id": "be1263f5-8a9f-4748-8436-6e4829022104",
									"label": "1",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "kennt alle Buchstaben sicher. Die Laut-Buchstaben-Zuordnung beherrschte"
										},
										{
											"type": "genderVariant",
											"value": [
												"er",
												"sie"
											]
										},
										{
											"type": "text",
											"value": "früh."
										},
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "kann Wörter mühelos lautieren und unter Berücksichtigung einfacher Rechtschreibregeln lautgetreu verschriften. Zusätzliche orthographische Besonderheiten merkt"
										},
										{
											"type": "genderVariant",
											"value": [
												"er",
												"sie"
											]
										},
										{
											"type": "text",
											"value": "sich bereits und wendet diese teilweise an. Eigene Erfahrungen und Erlebnisse sowie kurze Texte nach Vorgaben schreibt"
										},
										{
											"type": "genderVariant",
											"value": [
												"er",
												"sie"
											]
										},
										{
											"type": "text",
											"value": "problemlos unter Beachtung der Wortgrenzen auf."
										},
										{
											"type": "optionalGroup",
											"id": "c9924175-4533-4fea-aa60-e99b6b0e4216",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "Es gelingt"
												},
												{
													"type": "genderVariant",
													"value": [
														"ihm",
														"ihr"
													]
												},
												{
													"type": "text",
													"value": "bereits, Satzgrenzen zu kennzeichnen."
												}
											]
										}
									]
								}
							]
						},
						{
							"id": "93b39418-1023-4c3d-8ed2-decc079076e1",
							"label": "4",
							"variants": [
								{
									"id": "97c5d82d-57fa-4ffe-9e3d-c6ea7fc4b4d8",
									"label": "1",
									"sentences": [
										{
											"type": "name"
										},
										{
											"type": "text",
											"value": "kennt die häufig geübten Buchstaben und kann vielen Lauten den entsprechenden Buchstaben zuordnen."
										},
										{
											"type": "genderVariant",
											"value": [
												"Er",
												"Sie"
											]
										},
										{
											"type": "text",
											"value": "kann sehr einfache, kurze Wörter lautgetreu verschriften. Es kommen allerdings"
										},
										{
											"type": "optionalGroup",
											"id": "d950dadc-fccc-4d0c-b5ea-0a129ce55628",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "oft"
												}
											]
										},
										{
											"type": "optionalGroup",
											"id": "7933c688-11c1-4a7c-b213-7b47b2e9a808",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "manchmal"
												}
											]
										},
										{
											"type": "text",
											"value": "noch Buchstabenauslassungen vor. Das Aufschreiben einfacher kurzer Sätze"
										},
										{
											"type": "optionalGroup",
											"id": "64202665-2560-4271-9ba4-3588496e9a1f",
											"enabledByDefault": true,
											"parts": [
												{
													"type": "text",
													"value": "zu Vorgaben oder Erlebnissen"
												}
											]
										},
										{
											"type": "text",
											"value": "gelingt"
										},
										{
											"type": "genderVariant",
											"value": [
												"ihm",
												"ihr"
											]
										},
										{
											"type": "text",
											"value": "unter Anleitung."
										}
									]
								}
							]
						}
					]
				}
			]
		}
	]
}

/** Real sentence from „Mündlicher Sprachgebrauch“, Stufe 1, Variante 1 — used by the landing sentence builder demo. */
export const landingSentenceCreateDemoSentences: SentencePart[] =
	landingTemplateSet.subjects[0]!.categories[0]!.grades[0]!.variants[0]!.sentences

export const landingDemoStudent: Student = {
	"id": "landing-demo-student",
	"name": "Max",
	"surname": "Müller",
	"gender": "male",
	"templateSetId": "landing-demo-set",
	"reportSelection": {
		"selectedSubjectId": "4ad48c2a-0e9a-47c2-b8d4-016cceed1f32",
		"expandedCategoryIds": [],
		"categories": {
			"95458392-9634-4c1f-9dda-e1101b8a52b6": {
				"gradeId": "5e1a88dc-aca5-461f-858d-685b584f5e45",
				"variantIds": [
					"e82a5289-1f3a-45ca-a2f3-65b191ed2af4"
				]
			},
			"fc2e937e-1d54-455d-bff9-aeafbb3a5dff": {
				"gradeId": "21763bba-169a-4403-b0d6-5edc7e22e3be",
				"variantIds": [
					"be1263f5-8a9f-4748-8436-6e4829022104"
				]
			}
		}
	}
}
