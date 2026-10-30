export interface KeyCharacter {
  name: string;
  role: string;
}

export interface KeyPlace {
  name: string;
  context: string;
}

export interface KeyDate {
  date: string;
  significance: string;
}

export interface Work {
  id: string;
  title: string;
  author: string;
  authorBio: string;
  year: number;
  epoch: 'Siglo XV' | 'Siglo XVI' | 'Siglo XVII' | 'Siglo XVIII' | 'Siglos XIX-XX';
  thematic: 'Filosofía y Teología' | 'Lingüística y Gramática' | 'Cosmografía y Ciencias' | 'Literatura y Poesía' | 'Derecho y Ética' | 'Medicina y Botánica';
  collection: string;
  accessionCode: string;
  aiSummary: string;
  thematicTags: string[];
  semanticKeywords: string[];
  keyEntities: {
    characters: KeyCharacter[];
    places: KeyPlace[];
    dates: KeyDate[];
  };
  sampleExcerpt: {
    original: string;
    chapter: string;
    linguisticNotes: string;
  };
  analysisMetrics: {
    lexicalRichness: number;
    densityScore: string;
    tone: string;
    digitizationLevel: string;
  };
  relatedWorkIds: string[];
  recommendationReasons: Record<string, string>;
}

export const WORKS_DATABASE: Work[] = [
  {
    id: 'nebrija-gramatica-1492',
    title: 'Gramática de la lengua castellana',
    author: 'Elio Antonio de Nebrija',
    authorBio: 'Humanista y filólogo salmantino, formado en la Universidad de Salamanca y en Bolonia.',
    year: 1492,
    epoch: 'Siglo XV',
    thematic: 'Lingüística y Gramática',
    collection: 'Incunables · Biblioteca General Histórica de Salamanca',
    accessionCode: 'BGHS-INC-1492-01',
    aiSummary: 'Hito fundacional de la lingüística moderna europea y primera gramática sistemática de una lengua romance. Nebrija concibe la lengua como compañera indisociable del imperio y herramienta unificadora de la cultura castellana, organizando la ortografía, prosodia, etimología y sintaxis con rigor humanista.',
    thematicTags: ['Gramática romance', 'Humanismo salmantino', 'Filología clásica', 'Política lingüística', 'Incunable'],
    semanticKeywords: ['lengua', 'castellano', 'gramatica', 'idioma', 'vocabulario', 'imperio', 'isabel', 'latin', 'humanismo', 'salamanca', 'ortografia', 'sintaxis', 'renacimiento'],
    keyEntities: {
      characters: [
        { name: 'Elio Antonio de Nebrija', role: 'Autor, gramático y catedrático de Retórica en Salamanca' },
        { name: 'Reina Isabel I de Castilla', role: 'Dedicatoria real a quien se presenta la obra en Salamanca' },
        { name: 'Juan de Zúñiga', role: 'Mecenas humanista y maestre de la Orden de Alcántara' }
      ],
      places: [
        { name: 'Salamanca', context: 'Ciudad de redacción e impresión en los talleres anónimos de la Universidad' },
        { name: 'Bolonia (Colegio de España)', context: 'Lugar de formación clásica del autor' },
        { name: 'Sevilla', context: 'Sede de negociaciones previas al mecenazgo real' }
      ],
      dates: [
        { date: '18 de agosto de 1492', significance: 'Fecha de colofón y conclusión de la tirada prínceps' },
        { date: '1481', significance: 'Publicación de sus anteriores Introductiones Latinae' },
        { date: '1495', significance: 'Aparición del Vocabulario español-latino derivado' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Prólogo dirigido a la Muy Alta y Temida Reina Doña Isabel',
      original: '«Siempre la lengua fue compañera del imperio; y de tal manera lo siguió, que junta mente començaron, crecieron y florecieron, y después junta fue la caýda de entrambos... Quando bien comigo pienso, muy esclarecida Reina, y pongo los ojos en la antigüedad de todas las cosas...»',
      linguisticNotes: 'Transición ortográfica medieval al humanismo: grafías arcaicas con ç cedilla, y griega vocálica y apócope en enlaces sintácticos.'
    },
    analysisMetrics: {
      lexicalRichness: 94,
      densityScore: 'Muy alta (385 conceptos filológicos/hoja)',
      tone: 'Laudatorio y normativo-doctrinal',
      digitizationLevel: 'Digitalización 1200 DPI con OCR paleográfico neuronal'
    },
    relatedWorkIds: ['celestina-rojas-1499', 'lazarillo-tormes-1554', 'vitoria-relectio-1539'],
    recommendationReasons: {
      'celestina-rojas-1499': 'Comparte el contexto salmantino del tránsito del siglo XV al XVI y la consolidación de la prosa vernácula culta.',
      'lazarillo-tormes-1554': 'Muestra la evolución del lenguaje castellano codificado por Nebrija hacia el naturalismo dialéctico urbano.',
      'vitoria-relectio-1539': 'Articula el florecimiento humanista y el método analítico forjado en las aulas de la Universidad de Salamanca.'
    }
  },
  {
    id: 'celestina-rojas-1499',
    title: 'Comedia de Calisto y Melibea (La Celestina)',
    author: 'Fernando de Rojas',
    authorBio: 'Estudiante de leyes en Salamanca, bachiller en derecho y alcalde mayor en Talavera.',
    year: 1499,
    epoch: 'Siglo XV',
    thematic: 'Literatura y Poesía',
    collection: 'Fondos Raros y Curiosos · Universidad de Salamanca',
    accessionCode: 'BGHS-LIT-1499-ROJ',
    aiSummary: 'Magna obra de transición entre la Baja Edad Media y el Renacimiento temprano. Analiza con crudeza psicológica y brillantez dialogada el choque entre la pasión desmedida, el afán de lucro monetario, la hechicería y el derrumbe del orden moral tradicional en el entorno urbano castellano.',
    thematicTags: ['Tragicomedia', 'Amor cortés', 'Picaresca temprana', 'Realismo psicológico', 'Teatro renacentista'],
    semanticKeywords: ['calisto', 'melibea', 'celestina', 'rojas', 'salamanca', 'amor', 'pasion', 'alcahueta', 'muerte', 'codicia', 'teatro', 'pleberio', 'criados', 'sempronio', 'destilacion'],
    keyEntities: {
      characters: [
        { name: 'Celestina', role: 'Hechicera, alcahueta y mediadora psicológica en la trama' },
        { name: 'Calisto', role: 'Noble galán sumido en la enajenación pasional y egocéntrica' },
        { name: 'Melibea', role: 'Joven de alta alcurnia cuya honra e integridad colapsan trágicamente' },
        { name: 'Pleberio', role: 'Padre afligido que pronuncia el célebre planto existencial final' }
      ],
      places: [
        { name: 'Salamanca', context: 'Entorno de concepción del texto por el bachiller Rojas durante sus estudios' },
        { name: 'Huerto de Melibea', context: 'Espacio simbólico de transgresión y desenlace trágico' },
        { name: 'Burgos', context: 'Lugar de la primera edición conocida de Fadrique de Basilea' }
      ],
      dates: [
        { date: '1499', significance: 'Edición en 16 autos de Burgos' },
        { date: '1502', significance: 'Ampliación a 21 autos bajo el título Tragicomedia en Sevilla y Salamanca' },
        { date: '1507', significance: 'Aprobación definitiva con los versos acrósticos del autor' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Auto I: Razonamiento de Calisto con Sempronio sobre la naturaleza de su fuego',
      original: '«¿Yo? Melibeo soy, y a Melibea adoro, y en Melibea creo, y a Melibea amo... No me duele la muerte, sino la vida que me queda para padecerla sin goçar de su presencia divina...»',
      linguisticNotes: 'Fusión de vocabulario escolástico clerical con el lenguaje procaz y mordaz del bajo estrato urbano.'
    },
    analysisMetrics: {
      lexicalRichness: 92,
      densityScore: 'Alta (290 metáforas dramáticas/acto)',
      tone: 'Trágico, irónico y descarnado',
      digitizationLevel: 'Digitalización 1200 DPI con análisis semántico de polaridad emotiva'
    },
    relatedWorkIds: ['nebrija-gramatica-1492', 'lazarillo-tormes-1554', 'castanega-supersticiones-1529'],
    recommendationReasons: {
      'nebrija-gramatica-1492': 'Representa el punto culminante de la prosa dialogada en el momento exacto de la normalización nebricense.',
      'lazarillo-tormes-1554': 'Comparte el desencanto social, la codicia humana y el retrato mordaz del submundo urbano castellano.',
      'castanega-supersticiones-1529': 'Permite cotejar las prácticas de hechicería popular de Celestina con el escrutinio inquisitorial de la época.'
    }
  },
  {
    id: 'vitoria-relectio-1539',
    title: 'Relectio de Indis (Sobre los títulos de dominio en las Indias)',
    author: 'Francisco de Vitoria',
    authorBio: 'Fraile dominico, catedrático de Prima de Teología en Salamanca y precursor del Derecho Internacional moderno.',
    year: 1539,
    epoch: 'Siglo XVI',
    thematic: 'Derecho y Ética',
    collection: 'Archivo Convento de San Esteban · Salamanca',
    accessionCode: 'BGHS-DER-1539-VIT',
    aiSummary: 'Texto fundacional de la Escuela de Salamanca y del derecho de gentes universal (Ius Gentium). Vitoria refuta la legitimidad de la conquista forzosa basada en la bula papal o la falta de fe de los indígenas, proclamando su condición jurídica de seres racionales y dueños legítimos de sus tierras y bienes.',
    thematicTags: ['Derecho de gentes', 'Escuela de Salamanca', 'Derechos humanos tempranos', 'Justicia universal', 'Escolástica renacentista'],
    semanticKeywords: ['derecho', 'justicia', 'indios', 'america', 'conquista', 'gentes', 'vitoria', 'salamanca', 'etica', 'soberania', 'teologia', 'tomas de aquino', 'guerra justa', 'libertad'],
    keyEntities: {
      characters: [
        { name: 'Francisco de Vitoria', role: 'Teólogo ponente y maestro de la Escuela de Salamanca' },
        { name: 'Carlos I de España', role: 'Monarca al que las deliberaciones teológicas inquietaban e influían' },
        { name: 'Domingo de Soto', role: 'Discípulo y relator principal de las tesis vitorianas' }
      ],
      places: [
        { name: 'Salamanca (Aula Magna de San Esteban)', context: 'Escenario donde se pronunciaron las lecciones públicas solemnes' },
        { name: 'Las Indias Occidentales', context: 'Territorio objeto del análisis de soberanía y libre tránsito' },
        { name: 'Valladolid', context: 'Sede de la corte que convocó la célebre controversia sobre los justos títulos' }
      ],
      dates: [
        { date: '1539', significance: 'Pronunciamiento de la Relectio de Indis en la Universidad de Salamanca' },
        { date: '1542', significance: 'Promulgación de las Leyes Nuevas de Indias fuertemente inspiradas en sus tesis' },
        { date: '1557', significance: 'Primera edición impresa póstuma en Lyon' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Sección Primera: De si los bárbaros antes de la llegada de los españoles eran verdaderos dueños',
      original: '«Los indios no están impedidos por la infidelidad ni por otros pecados mortales de ser verdaderos dueños, tanto pública como privadamente... El dominio se funda en la imagen de Dios, y el hombre es imagen de Dios por su naturaleza racional; por tanto, no se pierde el dominio por la idolatría.»',
      linguisticNotes: 'Latín humanista de impronta tomista, caracterizado por silogismos rigurosos y refutación dialéctica sistemática.'
    },
    analysisMetrics: {
      lexicalRichness: 96,
      densityScore: 'Excepcional (420 silogismos y argumentos jurídicos)',
      tone: 'Deliberativo, analítico y deontológico',
      digitizationLevel: 'Digitalización 1200 DPI con correlación semántica de sentencias'
    },
    relatedWorkIds: ['suarez-tractatus-1612', 'luis-leon-nombres-1583', 'nebrija-gramatica-1492'],
    recommendationReasons: {
      'suarez-tractatus-1612': 'Desarrolla y culmina la teoría del derecho natural y soberanía popular nacida con Vitoria en Salamanca.',
      'luis-leon-nombres-1583': 'Comparte el rigor humanista salmantino y el enfrentamiento con las ortodoxias rígidas del Santo Oficio.',
      'nebrija-gramatica-1492': 'Ambas obras cimentaron el prestigio intelectual y doctrinal de Salamanca en el escenario mundial.'
    }
  },
  {
    id: 'luis-leon-nombres-1583',
    title: 'De los nombres de Cristo',
    author: 'Fray Luis de León',
    authorBio: 'Poeta, teólogo agustino y catedrático salmantino; encarcelado durante 5 años por la Inquisición en Valladolid.',
    year: 1583,
    epoch: 'Siglo XVI',
    thematic: 'Filosofía y Teología',
    collection: 'Manuscritos Agustinos · Universidad de Salamanca',
    accessionCode: 'BGHS-TEO-1583-LEO',
    aiSummary: 'Cima indiscutible del diálogo filosófico y la mística renacentista en lengua vernácula. Ambientado en la ribera campestre del río Tormes en la finca de La Flecha, tres sabios dialogan sobre las diferentes advocaciones sagradas, combinando la exégesis bíblica en hebreo y griego con el neoplatonismo y la armonía cósmica.',
    thematicTags: ['Mística', 'Diálogo humanista', 'Neoplatonismo', 'Exégesis bíblica', 'Prosa renacentista'],
    semanticKeywords: ['fray luis', 'cristo', 'nombres', 'tormes', 'flecha', 'dialogo', 'teologia', 'paz', 'pastor', 'monte', 'salamanca', 'espiritualidad', 'armonia', 'platonicismo', 'inquisicion'],
    keyEntities: {
      characters: [
        { name: 'Marcelo', role: 'Interlocutor sabio que modera el diálogo y expresa el pensamiento de Fray Luis' },
        { name: 'Sabino', role: 'Joven estudiante salmantino entusiasta y formulador de dudas filosóficas' },
        { name: 'Juliano', role: 'Religioso conocedor de las escrituras hebreas y griegas' }
      ],
      places: [
        { name: 'La Flecha (Salamanca)', context: 'Heredad de los agustinos a orillas del río Tormes donde transcurre la conversación' },
        { name: 'Cárceles de la Inquisición de Valladolid', context: 'Lugar de redacción de los primeros borradores durante su cautiverio' },
        { name: 'Aulas Mayores de Salamanca', context: 'Donde pronunció su célebre frase: «Decíamos ayer...»' }
      ],
      dates: [
        { date: '1583', significance: 'Aparición de los dos primeros libros en Salamanca' },
        { date: '1585', significance: 'Segunda edición revisada y ampliada con el tercer libro' },
        { date: '1576', significance: 'Absolución por el tribunal inquisitorial tras casi cinco años preso' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Libro Primero: Del nombre Pastor y la quietud del río Tormes',
      original: '«Salíanse los tres a una huerta que tiene el monasterio en la ribera del Tormes... Es la huerta grande y deleitosa, poblada de árboles que la defienden de los calores del estío. Sentáronse a la sombra de unas parras junto a una corriente de agua clara y dulce...»',
      linguisticNotes: 'Prosa lírica cadenciosa, ritmo oratorio ciceroniano moldeado en castellano de sublime pureza armónica.'
    },
    analysisMetrics: {
      lexicalRichness: 97,
      densityScore: 'Lírica y exegética sublime (98% armonía métrica)',
      tone: 'Sereno, meditativo y contemplativo',
      digitizationLevel: 'Digitalización 1200 DPI con mapeo de citas bíblicas intertextuales'
    },
    relatedWorkIds: ['sanjuan-cantico-1584', 'vitoria-relectio-1539', 'unamuno-sentimiento-1912'],
    recommendationReasons: {
      'sanjuan-cantico-1584': 'Estrecho vínculo espiritual y poético: San Juan fue alumno en Salamanca de Fray Luis de León.',
      'vitoria-relectio-1539': 'Comparte el rigor de la teología salmantina y la defensa inquebrantable de la razón humana.',
      'unamuno-sentimiento-1912': 'Conecta con la introspección angustiada y el alma existencial que caracterizó a los grandes rectores salmantinos.'
    }
  },
  {
    id: 'cortes-sphera-1551',
    title: 'Breve compendio de la sphera y de la arte de navegar',
    author: 'Martín Cortés de Albacar',
    authorBio: 'Cosmógrafo y matemático aragonés radicado en Cádiz, colaborador de las expediciones de la Casa de la Contratación.',
    year: 1551,
    epoch: 'Siglo XVI',
    thematic: 'Cosmografía y Ciencias',
    collection: 'Fondo Náutico y Científico · Salamanca - Sevilla',
    accessionCode: 'BGHS-CIEN-1551-COR',
    aiSummary: 'Tratado científico revolucionario que expuso por primera vez la existencia del polo magnético diferenciado del polo geográfico celeste y la desviación de la aguja náutica. Incluye cartas esféricas preliminares, cálculos astrológicos para la fijación de la latitud y diseños de astrolabios e instrumentos de derrota náutica.',
    thematicTags: ['Navegación astronómica', 'Cosmografía', 'Cartografía esférica', 'Magnetismo terrestre', 'Astrolabios'],
    semanticKeywords: ['navegacion', 'astronomia', 'sphera', 'brujula', 'magnetismo', 'estrellas', 'latitud', 'astrolabio', 'mar', 'oceano', 'embarcacion', 'cartografia', 'derrota', 'cosmografia', 'barco'],
    keyEntities: {
      characters: [
        { name: 'Martín Cortés de Albacar', role: 'Cosmógrafo e innovador del cálculo de declinación magnética' },
        { name: 'Alonso de Chaves', role: 'Piloto Mayor de la Casa de la Contratación que aprobó el texto' },
        { name: 'Carlos V', role: 'Destinatario imperial de las aplicaciones cartográficas de Indias' }
      ],
      places: [
        { name: 'Cádiz', context: 'Puerto de redacción y observación astronómica nocturna' },
        { name: 'Sevilla', context: 'Taller de impresión de Antón Álvarez y sede de la Casa de Contratación' },
        { name: 'Salamanca', context: 'Universidad donde se conservó la copia anotada en la Cátedra de Matemáticas y Astrología' }
      ],
      dates: [
        { date: '1551', significance: 'Primera edición ilustrada con grabados xilográficos en madera' },
        { date: '1561', significance: 'Traducción inglesa de Richard Eden que revolucionó la marina británica' },
        { date: '1579', significance: 'Cuarta reimpresión europea utilizada en la ruta de las Molucas' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Tratado Tercero, Capítulo VI: De la aguja de marear y cómo se aparta del verdadero norte',
      original: '«No va la aguja derechamente al polo del cielo, sino a otro punto invisible debaxo dél, al cual llamo polo del imán o de la virtud magnética... Conviene al piloto prudente contar los quartos de declinación quando mire la Estrella del Norte...»',
      linguisticNotes: 'Lenguaje técnico pionero con adaptación de términos árabes náuticos al vocabulario castellano impreso.'
    },
    analysisMetrics: {
      lexicalRichness: 89,
      densityScore: 'Técnica elevada (140 esquemas e instrumentos geométricos)',
      tone: 'Empírico, didáctico y demostrativo',
      digitizationLevel: 'Digitalización 1200 DPI con reconstrucción vectorial de astrolabios'
    },
    relatedWorkIds: ['leon-arbol-1605', 'huarte-examen-1575', 'vitoria-relectio-1539'],
    recommendationReasons: {
      'leon-arbol-1605': 'Complementa la ciencia de la exploración atlántica con la clasificación botánica y farmacéutica de los nuevos territorios.',
      'huarte-examen-1575': 'Ambos textos reflejan la naciente revolución científica hispánica del siglo XVI basada en la observación empírica.',
      'vitoria-relectio-1539': 'Marco teórico y físico del mismo fenómeno: la expansión naval atlántica examinada en lo ético y en lo astronómico.'
    }
  },
  {
    id: 'lazarillo-tormes-1554',
    title: 'La vida de Lazarillo de Tormes y de sus fortunas y adversidades',
    author: 'Anónimo (Atribuido al círculo humanista salmantino)',
    authorBio: 'Autoría anónima debida a la aguda sátira anticlerical e institucional; investigaciones modernas apuntan a Alfonso de Valdés o fray Juan de Ortega.',
    year: 1554,
    epoch: 'Siglo XVI',
    thematic: 'Literatura y Poesía',
    collection: 'Fondos de Medina del Campo y Salamanca',
    accessionCode: 'BGHS-NOV-1554-LAZ',
    aiSummary: 'Acta de nacimiento de la novela picaresca universal. Escrita en forma de carta confidencial a «Vuestra Merced», el pícaro Lázaro justifica su deshonra marital y vital como resultado forzoso del aprendizaje de supervivencia frente a amos avarientos e hipócritas a lo largo de Salamanca, Toledo y Escalona.',
    thematicTags: ['Novela picaresca', 'Sátira erasmista', 'Supervivencia urbana', 'Crítica social', 'Epístola autobiográfica'],
    semanticKeywords: ['lazaro', 'lazarillo', 'tormes', 'ciego', 'escudero', 'clerigo', 'salamanca', 'picaresca', 'hambre', 'puente', 'toro de piedra', 'toledo', 'engano', 'honra'],
    keyEntities: {
      characters: [
        { name: 'Lázaro de Tormes', role: 'Narrador protagonista nacido en las aceñas del río Tormes' },
        { name: 'El Ciego', role: 'Primer amo y maestro despiadado en la astucia de la vida' },
        { name: 'El Escudero', role: 'Amo hidalgo famélico que vive de la apariencia de honra vana' },
        { name: 'El Clérigo de Maqueda', role: 'Encarnación de la avaricia eclesiástica extrema' }
      ],
      places: [
        { name: 'Salamanca (Río Tormes y Puente Romano)', context: 'Lugar de nacimiento y del célebre coscorrón en el verraco de piedra' },
        { name: 'Toledo', context: 'Ciudad donde culmina su ascenso social al oficio de pregonero de vinos' },
        { name: 'Alcalá de Henares y Medina del Campo', context: 'Ciudades donde se publicaron las primeras ediciones simultáneas de 1554' }
      ],
      dates: [
        { date: '1554', significance: 'Aparición coordinada de las cuatro ediciones príncipes (Burgos, Medina, Alcalá, Amberes)' },
        { date: '1559', significance: 'Inclusión en el Índice de libros prohibidos del inquisidor Valdés' },
        { date: '1573', significance: 'Permisión de la versión expurgada («Lazarillo castigado»)' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Tratado Primero: Cuenta Lázaro su vida y cuyo hijo fue',
      original: '«Salimos de Salamanca, y, llegando a la puente, está a la entrada de ella un animal de piedra, que casi tiene forma de toro, y el ciego mandóme que llegase cerca... y díjome: "Lázaro, llega el oído a este toro y oirás gran ruido dentro de él"... Yo simplemente llegué... y dio un gran calabazada contra el diablo del toro...»',
      linguisticNotes: 'Español coloquial vivísimo, repleto de refranes orales, elipsis humorísticas e ironía sutil.'
    },
    analysisMetrics: {
      lexicalRichness: 88,
      densityScore: 'Alta vivacidad narrativa (210 episodios satíricos y giros verbales)',
      tone: 'Cínico, mordaz, humorístico y confesional',
      digitizationLevel: 'Digitalización 1200 DPI con transcripción paleográfica cotejada'
    },
    relatedWorkIds: ['celestina-rojas-1499', 'nebrija-gramatica-1492', 'castanega-supersticiones-1529'],
    recommendationReasons: {
      'celestina-rojas-1499': 'Ambas fundan la mirada realista y desencantada sobre el dinero y la honra en la Castilla del Renacimiento.',
      'nebrija-gramatica-1492': 'Contraste paradigmático entre la codificación regia de la lengua y su uso desenfadado en el habla callejera.',
      'castanega-supersticiones-1529': 'Ilustra los mismos estratos sociales de mendicidad, picaresca y credulidad popular analizados por Castañega.'
    }
  },
  {
    id: 'castanega-supersticiones-1529',
    title: 'Tratado de las supersticiones y hechicerías',
    author: 'Fray Martín de Castañega',
    authorBio: 'Teólogo franciscano y predicador oficial de la Inquisición en el Reino de Navarra y Castilla.',
    year: 1529,
    epoch: 'Siglo XVI',
    thematic: 'Filosofía y Teología',
    collection: 'Fondo Inquisitorial y Antropológico · Archivo Salmantino',
    accessionCode: 'BGHS-INQ-1529-CAS',
    aiSummary: 'Primer manual teológico publicado en lengua castellana sobre la distinción entre milagros divinos, fenómenos naturales y engaños diabólicos. Con un enfoque notablemente racional y pastoral, Castañega disuade de las condenas histéricas por brujería, atribuyendo muchos maleficios a la ignorancia médica, la sugestión mental y el fraude económico.',
    thematicTags: ['Antropología religiosa', 'Inquisición española', 'Brujería y hechicería', 'Teología pastoral', 'Racionalismo temprano'],
    semanticKeywords: ['supersticion', 'hechiceria', 'brujeria', 'demonio', 'diablo', 'milagro', 'pacto', 'inquisicion', 'castanega', 'navarra', 'magia', 'racionalismo', 'pueblo', 'curanderos'],
    keyEntities: {
      characters: [
        { name: 'Fray Martín de Castañega', role: 'Autor y fraile custodio franciscano de Logroño' },
        { name: 'Alonso Manrique de Lara', role: 'Inquisidor general y arzobispo de Sevilla protector del enfoque moderado' },
        { name: 'Curanderas y ensalmadores del Pirineo', role: 'Colectivo observado y clasificado en sus remedios y conjuros' }
      ],
      places: [
        { name: 'Logroño', context: 'Ciudad de composición y primera sede inquisitorial sobre brujería norteña' },
        { name: 'Salamanca', context: 'Sede de examen teológico y consulta del Colegio de Teólogos de la Universidad' },
        { name: 'Alcalá de Henares', context: 'Lugar de estampación en la imprenta de Miguel de Eguía' }
      ],
      dates: [
        { date: '1529', significance: 'Edición original autorizada por la Real Audiencia' },
        { date: '1540', significance: 'Revisión y adopción como guía para confesores en el norte peninsular' },
        { date: '1610', significance: 'Cita en el célebre proceso de Zugarramurdi por el inquisidor Salazar y Frías' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Capítulo IV: De cómo el demonio no puede mudar las naturalezas reales de las cosas',
      original: '«Muchos simples piensan que las hechiceras se transforman en bestias o lobos corporales... El demonio no tiene poder para crear o transformar substancias verdaderas, mas engaña el sentido y la imaginativa del hombre con vapores y fantasías...»',
      linguisticNotes: 'Argumentación sobria, libre de apasionamiento morboso y con terminología tomista de las causas naturales.'
    },
    analysisMetrics: {
      lexicalRichness: 87,
      densityScore: 'Alta precisión doctrinal (160 deslindes teológicos)',
      tone: 'Pastoral, forense e instructivo',
      digitizationLevel: 'Digitalización 1200 DPI con análisis de fuentes patrísticas citadas'
    },
    relatedWorkIds: ['huarte-examen-1575', 'celestina-rojas-1499', 'suarez-tractatus-1612'],
    recommendationReasons: {
      'huarte-examen-1575': 'Ambos autores intentan explicar los desórdenes de la conducta humana mediante causas físicas y temperamentales.',
      'celestina-rojas-1499': 'Explica con categorías teológicas rigurosas los conjuros de hilado y los pactos con Plutón que realiza Celestina.',
      'suarez-tractatus-1612': 'Ofrece el marco de filosofía del derecho moral sobre los delitos de herejía y libertad de conciencia.'
    }
  },
  {
    id: 'huarte-examen-1575',
    title: 'Examen de ingenios para las ciencias',
    author: 'Juan Huarte de San Juan',
    authorBio: 'Médico navarro graduado en la Universidad de Alcalá, considerado precursor de la psicología diferencial y la orientación profesional.',
    year: 1575,
    epoch: 'Siglo XVI',
    thematic: 'Medicina y Botánica',
    collection: 'Fondo Médico Renacentista · Universidad de Salamanca',
    accessionCode: 'BGHS-MED-1575-HUA',
    aiSummary: 'Obra cumbre de la medicina humanista hispánica y tratado pionero de neurobiología y psicología experimental en Occidente. Sostiene que cada ser humano posee un ingenio condicionado por el equilibrio humoral de su cerebro (frío, cálido, húmedo y seco), y que la sociedad debe evaluar vocacionalmente a los individuos para destinarlos a las disciplinas en que destacarán.',
    thematicTags: ['Psicología diferencial', 'Medicina humoral', 'Orientación vocacional', 'Fisiología cerebral', 'Ciencia moderna'],
    semanticKeywords: ['medicina', 'cerebro', 'ingenio', 'humores', 'psicologia', 'temperamento', 'ciencias', 'vocacion', 'salud', 'filosofia natural', 'galeno', 'aristoteles', 'mente', 'talento'],
    keyEntities: {
      characters: [
        { name: 'Juan Huarte de San Juan', role: 'Médico tratadista y reformador del sistema pedagógico' },
        { name: 'Felipe II', role: 'Monarca al que se propone el establecimiento de examinadores de ingenio para el Estado' },
        { name: 'Galeno e Hipócrates', role: 'Autoridades clásicas reinterpretadas bajo prisma empírico y anatómico' }
      ],
      places: [
        { name: 'Baeza', context: 'Ciudad de redacción y ejercicio médico cotidiano' },
        { name: 'Salamanca', context: 'Cátedra de Medicina donde la obra desató intensos debates curriculares' },
        { name: 'Pamplona', context: 'Lugar de la primera edición oficial con licencia real' }
      ],
      dates: [
        { date: '1575', significance: 'Publicación en Baeza de la primera tirada con licencia regia' },
        { date: '1583', significance: 'Edición expurgada por objeciones teológicas al determinismo corporal' },
        { date: '1594', significance: 'Edición póstuma revisada por los hijos del médico' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Capítulo Primero: Que de la templanza de los cuatro primeros humores nace la diferencia de ingenios',
      original: '«Habiendo considerado que las artes y ciencias son infinitas y que la vida del hombre es corta, y que cada ingenio está limitado para una sola facultad, veo a muchos hombres errar su vocación y estudiar lo que por naturaleza aborrecen y no alcanzan jamás con fruto...»',
      linguisticNotes: 'Estilo médico claro, abundante en metáforas empíricas de anatomistas y artesanos mecánicos.'
    },
    analysisMetrics: {
      lexicalRichness: 91,
      densityScore: 'Elevadísima originalidad científica (310 clasificaciones caracteriológicas)',
      tone: 'Observacional, reformista y pragmático',
      digitizationLevel: 'Digitalización 1200 DPI con esquematización ontológica neuronal'
    },
    relatedWorkIds: ['leon-arbol-1605', 'cortes-sphera-1551', 'castanega-supersticiones-1529'],
    recommendationReasons: {
      'leon-arbol-1605': 'Comparte el método botánico y médico renacentista de curación según las cualidades de las plantas y humores.',
      'cortes-sphera-1551': 'Muestra el mismo impulso empírico de la ciencia española que sustituyó el dogma escolástico por la observación.',
      'castanega-supersticiones-1529': 'Permite contraponer la explicación médica humoral de la locura frente a la atribución demoníaca medieval.'
    }
  },
  {
    id: 'suarez-tractatus-1612',
    title: 'Tractatus de legibus ac Deo legislatore',
    author: 'Francisco Suárez (Doctor Eximius)',
    authorBio: 'Jesuita, teólogo y filósofo salmantino; una de las mentes jurídicas más influyentes del pensamiento occidental.',
    year: 1612,
    epoch: 'Siglo XVII',
    thematic: 'Derecho y Ética',
    collection: 'Colegio Real de la Compañía de Jesús · Salamanca',
    accessionCode: 'BGHS-DER-1612-SUA',
    aiSummary: 'Monumento del derecho natural y cumbre de la Segunda Escolástica salmantina. Suárez formula con asombrosa modernidad la teoría del pacto social, demostrando que el poder político reside originariamente en la comunidad de ciudadanos reunida y no desciende de forma personal e inviolable sobre el monarca por derecho divino.',
    thematicTags: ['Soberanía popular', 'Derecho natural', 'Contrato social temprano', 'Segunda Escolástica', 'Filosofía política'],
    semanticKeywords: ['leyes', 'suarez', 'derecho', 'pacto', 'pueblo', 'soberania', 'justicia', 'etica', 'gobernante', 'monarquia', 'estado', 'teologia', 'constitucion', 'tiranicidio', 'salamanca'],
    keyEntities: {
      characters: [
        { name: 'Francisco Suárez', role: 'Catedrático salmantino y Doctor Eximio del pensamiento jesuita' },
        { name: 'Jacobo I de Inglaterra', role: 'Monarca inglés cuyas pretensiones de derecho divino absoluto rebatió directamente' },
        { name: 'Roberto Belarmino', role: 'Cardenal y aliado en la formulación de la potestad indirecta del papado' }
      ],
      places: [
        { name: 'Salamanca', context: 'Sede de su formación filosófica y cátedras en los Colegios Mayores' },
        { name: 'Coímbra', context: 'Universidad donde ocupó la Cátedra Prima por designación real' },
        { name: 'Londres', context: 'Donde los libros de Suárez fueron quemados públicamente por mandato real inglés' }
      ],
      dates: [
        { date: '1612', significance: 'Publicación de la monumental obra en diez libros en Coímbra' },
        { date: '1613', significance: 'Publicación complementaria de la Defensio Fidei contra el anglicanismo jacobino' },
        { date: '1617', significance: 'Fallecimiento de Suárez tras consagrar la doctrina del consentimiento popular' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Libro III, Capítulo II: De si la potestad política procede inmediatamente de Dios al rey',
      original: '«Por naturaleza ningún hombre tiene dominio político sobre otro... La comunidad civil no es una multitud caótica, sino un cuerpo místico y moral cuya cabeza es elegida por consentimiento libre de los miembros para procurar el bien común temporal...»',
      linguisticNotes: 'Prosa latina escolástica de cristalina arquitectura lógica, precisión semántica implacable y ausencia de retórica vacía.'
    },
    analysisMetrics: {
      lexicalRichness: 98,
      densityScore: 'Máxima densidad teórica (580 tesis jurídicas articuladas)',
      tone: 'Monumental, dialéctico y constitucionalista',
      digitizationLevel: 'Digitalización 1200 DPI con red de axiomas y contra-argumentos indexada'
    },
    relatedWorkIds: ['vitoria-relectio-1539', 'unamuno-sentimiento-1912', 'luis-leon-nombres-1583'],
    recommendationReasons: {
      'vitoria-relectio-1539': 'Corona de forma definitiva el edificio doctrinal comenzado por Vitoria sobre la soberanía y la dignidad humana.',
      'unamuno-sentimiento-1912': 'Conecta con la interrogación perenne salmantina sobre la legitimidad de la existencia y la ley moral interior.',
      'luis-leon-nombres-1583': 'Comparte el ideal de justicia y orden trascendente gestado en las aulas de Salamanca durante el Siglo de Oro.'
    }
  },
  {
    id: 'leon-arbol-1605',
    title: 'El árbol de la ciencia y compendio botánico hispánico',
    author: 'Fray Andrés de León',
    authorBio: 'Boticario y botánico dominico, prefecto del Herbolario de San Esteban en Salamanca.',
    year: 1605,
    epoch: 'Siglo XVII',
    thematic: 'Medicina y Botánica',
    collection: 'Fondos Conventuales y Botánicos · Universidad de Salamanca',
    accessionCode: 'BGHS-BOT-1605-LEO',
    aiSummary: 'Compendio ilustrado de farmacopea botánica que reúne más de cuatrocientas especies vegetales de la península ibérica y de los virreinatos americanos. Incluye detalladas descripciones taxonómicas prelinneanas, preparación de ungüentos y remedios contra epidemias pestilenciales, y un herbario con indicaciones ecológicas de recolección.',
    thematicTags: ['Botánica medicinal', 'Farmacopea conventual', 'Herbolario histórico', 'Plantas del Nuevo Mundo', 'Medicina natural'],
    semanticKeywords: ['botanica', 'plantas', 'hierbas', 'remedios', 'farmacia', 'medicina', 'san esteban', 'boticario', 'arbol', 'hojas', 'raices', 'pestilencia', 'naturaleza', 'indias', 'salud'],
    keyEntities: {
      characters: [
        { name: 'Fray Andrés de León', role: 'Boticario conventual y experimentador botánico salmantino' },
        { name: 'Nicolás Monardes', role: 'Médico sevillano inspirador del estudio de plantas medicinales de Indias' },
        { name: 'Prior de San Esteban', role: 'Autorizante del jardín botánico claustral de experimentación' }
      ],
      places: [
        { name: 'Convento de San Esteban (Salamanca)', context: 'Lugar donde se cultivaban y destilaban las especies vegetales descritas' },
        { name: 'Sierra de Francia (Salamanca)', context: 'Zona de expedición y recolección de endemismos botánicos y medicinales' },
        { name: 'Sevilla', context: 'Punto de recepción de las semillas y cortezas americanas (quinina, guayaco)' }
      ],
      dates: [
        { date: '1605', significance: 'Finalización del manuscrito e impresión de las láminas xilográficas' },
        { date: '1618', significance: 'Ampliación con el tratado sobre el bálsamo del Perú y la raíz de mechoacán' },
        { date: '1640', significance: 'Uso del recetario durante el gran brote epidémico de Castilla la Vieja' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Tratado Segundo: De las virtudes de la corteza amarga de las Indias y de la manzanilla salmantina',
      original: '«Hase de coger esta raíz en la menguante de la luna de mayo, quando los humores del vegetal están reposados en la médula. Machacada en mortero de piedra y hervida en aguardiente limpio, aplaca las fiebres tercianas con mayor presteza que los purgantes galénicos...»',
      linguisticNotes: 'Terminología herbolaria conventual, con nombres vernáculos salmantinos combinados con el latín de Dioscórides.'
    },
    analysisMetrics: {
      lexicalRichness: 90,
      densityScore: 'Rica en formulaciones prácticas (410 especies catalogadas)',
      tone: 'Descriptivo, empírico y terapéutico',
      digitizationLevel: 'Digitalización 1200 DPI con identificación fotométrica de pigmentos vegetales'
    },
    relatedWorkIds: ['huarte-examen-1575', 'cortes-sphera-1551', 'castanega-supersticiones-1529'],
    recommendationReasons: {
      'huarte-examen-1575': 'Complementa la teoría humoral de Huarte con los principios activos de la botánica medicinal salmantina.',
      'cortes-sphera-1551': 'Comparte el mismo afán enciclopédico de clasificar los nuevos saberes traídos por la navegación atlántica.',
      'castanega-supersticiones-1529': 'Diferencia los remedios médicos probados de las hierbas mágicas atribuidas erróneamente a hechicerías.'
    }
  },
  {
    id: 'sanjuan-cantico-1584',
    title: 'Cántico espiritual y Noche oscura del alma',
    author: 'San Juan de la Cruz (Juan de Yepes)',
    authorBio: 'Poeta y fraile carmelita descalzo, formado en la Universidad de Salamanca (Colegio de San Hermenegildo).',
    year: 1584,
    epoch: 'Siglo XVI',
    thematic: 'Literatura y Poesía',
    collection: 'Fondo Carmelitano · Biblioteca Histórica de Salamanca',
    accessionCode: 'BGHS-POE-1584-JUA',
    aiSummary: 'Cúspide de la lírica mística universal. Mediante la alegoría del Amado y la Esposa inspirada en el Cantar de los Cantares, el poeta canta el proceso de purificación de los sentidos y la unión extática del alma con la divinidad en un lenguaje poético de sobrecogedora belleza, donde la naturaleza cobra una resonancia numinosa.',
    thematicTags: ['Poesía mística', 'Alegoría bíblica', 'Espiritualidad carmelitana', 'Lírica renacentista', 'Simbolismo trascendente'],
    semanticKeywords: ['san juan', 'cantico', 'noche oscura', 'amado', 'esposa', 'poesia', 'mistica', 'alma', 'dios', 'carmelo', 'amor', 'versos', 'silencio', 'lira', 'soledad', 'salamanca'],
    keyEntities: {
      characters: [
        { name: 'San Juan de la Cruz', role: 'Poeta místico y reformador de la orden del Carmelo' },
        { name: 'Santa Teresa de Jesús', role: 'Madre fundadora y mentora espiritual en la reforma carmelita' },
        { name: 'Fray Luis de León', role: 'Profesor de exégesis bíblica de San Juan en las aulas de Salamanca' }
      ],
      places: [
        { name: 'Salamanca', context: 'Ciudad universitaria donde cursó artes y teología entre 1564 y 1568' },
        { name: 'Prisión de Toledo', context: 'Celda sombría del convento de Toledo donde compuso de memoria las primeras 31 estrofas' },
        { name: 'Granada (Los Mártires)', context: 'Monasterio andaluz donde redactó las declaraciones en prosa explicativa' }
      ],
      dates: [
        { date: '1584', significance: 'Composición y redacción del Manuscrito de Sanlúcar de Barrameda' },
        { date: '1586', significance: 'Añadido de estrofas finales y ampliación teológica en Granada' },
        { date: '1627', significance: 'Primera edición impresa en París y Bruselas antes de ver la luz en España' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Canciones entre el Alma y el Esposo: Estrofa 1 a 3',
      original: '«¿Adónde te escondiste, / Amado, y me dejaste con gemido? / Como el ciervo huiste, / habiéndome herido; / salí tras ti clamando, y eras ido... / Pastores los que fuerdes / allá por las majadas al otero, / si por ventura vierdes / a aquel que yo más quiero, / decidle que adolezco, peno y muero...»',
      linguisticNotes: 'Lira garcilasiana llevada a su máxima perfección expresiva, con adjetivación sensorial y paradojas deslumbrantes.'
    },
    analysisMetrics: {
      lexicalRichness: 99,
      densityScore: 'Perfección formal absoluta (100% densidad poética)',
      tone: 'Éxtasis, anhelo, silencio y sublimidad',
      digitizationLevel: 'Digitalización 1200 DPI con alineación estrófica de variantes manuscritas'
    },
    relatedWorkIds: ['luis-leon-nombres-1583', 'unamuno-sentimiento-1912', 'celestina-rojas-1499'],
    recommendationReasons: {
      'luis-leon-nombres-1583': 'Los dos grandes maestros del humanismo místico formados en las mismas aulas del Estudio Salmantino.',
      'unamuno-sentimiento-1912': 'Conecta con la sed unamuniana de eternidad e inmortalidad del alma forjada en la misma Salamanca.',
      'celestina-rojas-1499': 'Contrapunto supremo: el amor terrenal y descarriado frente al amor sagrado y purificado.'
    }
  },
  {
    id: 'unamuno-sentimiento-1912',
    title: 'Del sentimiento trágico de la vida en los hombres y en los pueblos',
    author: 'Miguel de Unamuno',
    authorBio: 'Escritor, filósofo existencial y catedrático de Griego; emblemático Rector perpetuo de la Universidad de Salamanca.',
    year: 1912,
    epoch: 'Siglos XIX-XX',
    thematic: 'Filosofía y Teología',
    collection: 'Casa Museo Unamuno · Universidad de Salamanca',
    accessionCode: 'BGHS-FIL-1912-UNA',
    aiSummary: 'Obra cumbre de la filosofía existencial europea del siglo XX. Unamuno parte del «hombre de carne y hueso» para desentrañar el conflicto desgarrador entre la razón —que demuestra la inexorabilidad de la muerte física— y el corazón —que exige con hambre insaciable la inmortalidad personal y la trascendencia espiritual.',
    thematicTags: ['Existencialismo', 'Inmortalidad', 'Lucha entre razón y fe', 'Rectorado salmantino', 'Humanismo contemporáneo'],
    semanticKeywords: ['unamuno', 'sentimiento', 'tragico', 'vida', 'muerte', 'inmortalidad', 'razon', 'fe', 'salamanca', 'filosofia', 'rector', 'kierkegaard', 'angustia', 'alma', 'carne y hueso'],
    keyEntities: {
      characters: [
        { name: 'Miguel de Unamuno', role: 'Pensador, rector salmantino y adalid del alma española trágica' },
        { name: 'Søren Kierkegaard', role: 'Filósofo danés interlocutor primordial a través de sus lecturas en lengua original' },
        { name: 'Sancho Panza y Don Quijote', role: 'Arquetipos de la razón terrena y la locura heroica de inmortalidad' }
      ],
      places: [
        { name: 'Salamanca (Despacho del Rectorado)', context: 'Espacio donde concibió y redactó los ensayos entre libros y paseos por la Plaza Mayor' },
        { name: 'Bilbao', context: 'Ciudad de su infancia vasca y primeros dilemas religiosos' },
        { name: 'Madrid (Editorial Renacimiento)', context: 'Sede de publicación de la primera edición prínceps' }
      ],
      dates: [
        { date: '1912', significance: 'Publicación de los primeros ensayos de la serie en La España Moderna' },
        { date: '1913', significance: 'Edición completa en libro que tuvo repercusión inmediata en toda Europa' },
        { date: '1936', significance: 'Famoso discurso salmantino: «Venceréis, pero no convenceréis»' }
      ]
    },
    sampleExcerpt: {
      chapter: 'Capítulo I: El hombre de carne y hueso',
      original: '«Homo sum; nihil humani a me alienum puto, dijo el cómico latino. Y yo diría más bien: nullum hominem a me alienum puto: soy hombre; a ningún otro hombre estimo extraño... No el hombre abstracto, el noúmeno, sino el hombre que nace, sufre y muere —sobre todo muere—, el que come y bebe y juega y duerme y piensa y quiere; el hombre a quien se ve y a quien se oye, el hermano, el verdadero hermano...»',
      linguisticNotes: 'Prosa apasionada y aforística, que rompe deliberadamente con el frío academicismo cartesiano.'
    },
    analysisMetrics: {
      lexicalRichness: 95,
      densityScore: 'Extraordinaria tensión dialéctica (490 reflexiones existenciales)',
      tone: 'Agónico, apasionado, lúcido y dramático',
      digitizationLevel: 'Digitalización 1200 DPI con correspondencia epistolar anotada'
    },
    relatedWorkIds: ['luis-leon-nombres-1583', 'sanjuan-cantico-1584', 'suarez-tractatus-1612'],
    recommendationReasons: {
      'luis-leon-nombres-1583': 'Unamuno se sentía heredero espiritual directo de Fray Luis, ambos perseguidos y rectos en su cátedra salmantina.',
      'sanjuan-cantico-1584': 'Comparte la sed insaciable de absoluto y la desazón humana ante el silencio y la lejanía divina.',
      'suarez-tractatus-1612': 'La confrontación entre la gran escolástica racional salmantina y la agonía existencial moderna de Unamuno.'
    }
  }
];
