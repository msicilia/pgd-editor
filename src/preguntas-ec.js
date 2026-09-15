/* ------------------------------------------------------------------
   Las indicaciones de la plantilla de plan de gestión de datos de
   Horizon Europe, tal como figuran en el formulario de la Comisión.

   El texto en inglés (`seccion`, `sub`, `t`) se genera leyendo el
   propio DOCX oficial, para que sea literal y no una transcripción.
   Si la Comisión revisa la plantilla, se vuelve a generar y se ve qué
   identificadores han cambiado.

   La traducción al castellano (`seccion_es`, `sub_es`, `t_es`) es la
   que se imprime en el PDF, para que el documento esté en un solo
   idioma. El original se conserva junto a ella como referencia.

   Origen: https://ec.europa.eu/info/funding-tenders/opportunities/docs/2021-2027/horizon/temp-form/report/data-management-plan_he_en.docx
   Versión del documento: no declarada en el cuerpo del documento
   ------------------------------------------------------------------ */
window.PREGUNTAS_EC = [
  {
    "seccion": "Data Summary",
    "sub": null,
    "clave": "ds",
    "preguntas": [
      {
        "id": "ds1",
        "t": "Will you re-use any existing data and what will you re-use it for? State the reasons if re-use of any existing data has been considered but discarded.",
        "t_es": "¿Se reutilizarán datos existentes y con qué fin? Si se ha considerado y descartado la reutilización de datos existentes, indique los motivos."
      },
      {
        "id": "ds2",
        "t": "What types and formats of data will the project generate or re-use?",
        "t_es": "¿Qué tipos y formatos de datos generará o reutilizará el proyecto?"
      },
      {
        "id": "ds3",
        "t": "What is the purpose of the data generation or re-use and its relation to the objectives of the project?",
        "t_es": "¿Cuál es la finalidad de la generación o reutilización de los datos y cuál es su relación con los objetivos del proyecto?"
      },
      {
        "id": "ds4",
        "t": "What is the expected size of the data that you intend to generate or re-use?",
        "t_es": "¿Cuál es el tamaño previsto de los datos que se van a generar o reutilizar?"
      },
      {
        "id": "ds5",
        "t": "What is the origin/provenance of the data, either generated or re-used?",
        "t_es": "¿Cuál es el origen o la procedencia de los datos, tanto generados como reutilizados?"
      },
      {
        "id": "ds6",
        "t": "To whom might your data be useful ('data utility'), outside your project?",
        "t_es": "¿A quién podrían resultar útiles los datos fuera del proyecto (utilidad de los datos)?"
      }
    ],
    "seccion_es": "Resumen de los datos",
    "sub_es": null
  },
  {
    "seccion": "FAIR data",
    "sub": "Making data findable, including provisions for metadata",
    "clave": "f",
    "preguntas": [
      {
        "id": "f1",
        "t": "Will data be identified by a persistent identifier?",
        "t_es": "¿Se identificarán los datos mediante un identificador persistente?"
      },
      {
        "id": "f2",
        "t": "Will rich metadata be provided to allow discovery? What metadata will be created? What disciplinary or general standards will be followed? In case metadata standards do not exist in your discipline, please outline what type of metadata will be created and how.",
        "t_es": "¿Se proporcionarán metadatos suficientemente ricos para facilitar su localización? ¿Qué metadatos se crearán? ¿Qué estándares disciplinares o generales se seguirán? Si no existen estándares de metadatos en su disciplina, describa qué tipo de metadatos se crearán y cómo."
      },
      {
        "id": "f3",
        "t": "Will search keywords be provided in the metadata to optimize the possibility for discovery and then potential re-use?",
        "t_es": "¿Se incluirán en los metadatos palabras clave de búsqueda para optimizar la posibilidad de localización y, con ello, de reutilización?"
      },
      {
        "id": "f4",
        "t": "Will metadata be offered in such a way that it can be harvested and indexed?",
        "t_es": "¿Se ofrecerán los metadatos de forma que puedan ser recolectados e indexados?"
      }
    ],
    "seccion_es": "Datos FAIR",
    "sub_es": "Datos localizables, incluidas las disposiciones sobre metadatos"
  },
  {
    "seccion": "FAIR data",
    "sub": "Making data accessible",
    "clave": "ac",
    "preguntas": [
      {
        "id": "ac1",
        "t": "Will the data be deposited in a trusted repository?",
        "t_es": "¿Se depositarán los datos en un repositorio de confianza?"
      },
      {
        "id": "ac2",
        "t": "Have you explored appropriate arrangements with the identified repository where your data will be deposited?",
        "t_es": "¿Se han explorado los acuerdos oportunos con el repositorio identificado para el depósito de los datos?"
      },
      {
        "id": "ac3",
        "t": "Does the repository ensure that the data is assigned an identifier? Will the repository resolve the identifier to a digital object?",
        "t_es": "¿Garantiza el repositorio la asignación de un identificador a los datos? ¿Resolverá el repositorio ese identificador a un objeto digital?"
      },
      {
        "id": "ac4",
        "t": "Will all data be made openly available? If certain datasets cannot be shared (or need to be shared under restricted access conditions), explain why, clearly separating legal and contractual reasons from intentional restrictions. Note that in multi-beneficiary projects it is also possible for specific beneficiaries to keep their data closed if opening their data goes against their legitimate interests or other constraints as per the Grant Agreement.",
        "t_es": "¿Se pondrán todos los datos a disposición en abierto? Si determinados conjuntos no pueden compartirse, o deben compartirse con condiciones de acceso restringido, explique por qué, separando claramente los motivos legales y contractuales de las restricciones voluntarias. Tenga en cuenta que, en proyectos con varios beneficiarios, también es posible que beneficiarios concretos mantengan cerrados sus datos si abrirlos va en contra de sus intereses legítimos o de otras limitaciones previstas en el acuerdo de subvención."
      },
      {
        "id": "ac5",
        "t": "If an embargo is applied to give time to publish or seek protection of the intellectual property (e.g. patents), specify why and how long this will apply, bearing in mind that research data should be made available as soon as possible.",
        "t_es": "Si se aplica un embargo para disponer de tiempo para publicar o para proteger la propiedad intelectual (por ejemplo, mediante patentes), indique por qué y durante cuánto tiempo, teniendo presente que los datos de investigación deben ponerse a disposición lo antes posible."
      },
      {
        "id": "ac6",
        "t": "Will the data be accessible through a free and standardized access protocol?",
        "t_es": "¿Serán accesibles los datos mediante un protocolo de acceso gratuito y normalizado?"
      },
      {
        "id": "ac7",
        "t": "If there are restrictions on use, how will access be provided to the data, both during and after the end of the project?",
        "t_es": "Si existen restricciones de uso, ¿cómo se facilitará el acceso a los datos, tanto durante el proyecto como tras su finalización?"
      },
      {
        "id": "ac8",
        "t": "How will the identity of the person accessing the data be ascertained?",
        "t_es": "¿Cómo se comprobará la identidad de la persona que accede a los datos?"
      },
      {
        "id": "ac9",
        "t": "Is there a need for a data access committee (e.g. to evaluate/approve access requests to personal/sensitive data)?",
        "t_es": "¿Es necesario un comité de acceso a los datos (por ejemplo, para evaluar y aprobar las solicitudes de acceso a datos personales o sensibles)?"
      },
      {
        "id": "ac10",
        "t": "Will metadata be made openly available and licenced under a public domain dedication CC0, as per the Grant Agreement? If not, please clarify why. Will metadata contain information to enable the user to access the data?",
        "t_es": "¿Se pondrán los metadatos a disposición en abierto y bajo una dedicación al dominio público CC0, conforme al acuerdo de subvención? En caso contrario, explique por qué. ¿Contendrán los metadatos la información necesaria para que el usuario pueda acceder a los datos?"
      },
      {
        "id": "ac11",
        "t": "How long will the data remain available and findable? Will metadata be guaranteed to remain available after data is no longer available?",
        "t_es": "¿Durante cuánto tiempo permanecerán los datos disponibles y localizables? ¿Se garantiza que los metadatos seguirán disponibles cuando los datos dejen de estarlo?"
      },
      {
        "id": "ac12",
        "t": "Will documentation or reference about any software be needed to access or read the data be included? Will it be possible to include the relevant software (e.g. in open source code)?",
        "t_es": "¿Se incluirá documentación o referencia sobre el software necesario para acceder a los datos o leerlos? ¿Será posible incluir ese software (por ejemplo, como código abierto)?"
      }
    ],
    "seccion_es": "Datos FAIR",
    "sub_es": "Datos accesibles"
  },
  {
    "seccion": "FAIR data",
    "sub": "Making data interoperable",
    "clave": "io",
    "preguntas": [
      {
        "id": "io1",
        "t": "What data and metadata vocabularies, standards, formats or methodologies will you follow to make your data interoperable to allow data exchange and re-use within and across disciplines? Will you follow community-endorsed interoperability best practices? Which ones?",
        "t_es": "¿Qué vocabularios, estándares, formatos o metodologías de datos y metadatos se seguirán para que los datos sean interoperables y permitan su intercambio y reutilización dentro de la disciplina y entre disciplinas? ¿Se seguirán buenas prácticas de interoperabilidad avaladas por la comunidad? ¿Cuáles?"
      },
      {
        "id": "io2",
        "t": "In case it is unavoidable that you use uncommon or generate project specific ontologies or vocabularies, will you provide mappings to more commonly used ontologies? Will you openly publish the generated ontologies or vocabularies to allow reusing, refining or extending them?",
        "t_es": "Si resulta inevitable utilizar ontologías o vocabularios poco comunes, o generar otros propios del proyecto, ¿se proporcionarán correspondencias con ontologías de uso más extendido? ¿Se publicarán en abierto las ontologías o vocabularios generados para permitir su reutilización, mejora o ampliación?"
      },
      {
        "id": "io3",
        "t": "Will your data include qualified references to other data (e.g. other data from your project, or datasets from previous research)?",
        "t_es": "¿Incluirán los datos referencias cualificadas a otros datos (por ejemplo, otros datos del proyecto o conjuntos de datos de investigaciones anteriores)?"
      }
    ],
    "seccion_es": "Datos FAIR",
    "sub_es": "Datos interoperables"
  },
  {
    "seccion": "FAIR data",
    "sub": "Increase data re-use",
    "clave": "ru",
    "preguntas": [
      {
        "id": "ru1",
        "t": "How will you provide documentation needed to validate data analysis and facilitate data re-use (e.g. readme files with information on methodology, codebooks, data cleaning, analyses, variable definitions, units of measurement, etc.)?",
        "t_es": "¿Cómo se proporcionará la documentación necesaria para validar el análisis de los datos y facilitar su reutilización (por ejemplo, ficheros readme con información sobre la metodología, libros de códigos, depuración de datos, análisis, definiciones de variables, unidades de medida, etc.)?"
      },
      {
        "id": "ru2",
        "t": "Will your data be made freely available in the public domain to permit the widest re-use possible? Will your data be licensed using standard reuse licenses, in line with the obligations set out in the Grant Agreement?",
        "t_es": "¿Se pondrán los datos a disposición libremente en el dominio público para permitir la mayor reutilización posible? ¿Se licenciarán los datos con licencias de reutilización normalizadas, conforme a las obligaciones del acuerdo de subvención?"
      },
      {
        "id": "ru3",
        "t": "Will the data produced in the project be useable by third parties, in particular after the end of the project?",
        "t_es": "¿Podrán terceros utilizar los datos producidos en el proyecto, en particular tras su finalización?"
      },
      {
        "id": "ru4",
        "t": "Will the provenance of the data be thoroughly documented using the appropriate standards?",
        "t_es": "¿Se documentará exhaustivamente la procedencia de los datos conforme a los estándares adecuados?"
      },
      {
        "id": "ru5",
        "t": "Describe all relevant data quality assurance processes.",
        "t_es": "Describa todos los procesos pertinentes de aseguramiento de la calidad de los datos."
      },
      {
        "id": "ru6",
        "t": "Further to the FAIR principles, DMPs should also address research outputs other than data, and should carefully consider aspects related to the allocation of resources, data security and ethical aspects.",
        "t_es": "Además de los principios FAIR, los planes de gestión de datos deben abordar también los resultados de investigación distintos de los datos, y considerar con atención los aspectos relativos a la asignación de recursos, la seguridad de los datos y los aspectos éticos."
      }
    ],
    "seccion_es": "Datos FAIR",
    "sub_es": "Aumentar la reutilización de los datos"
  },
  {
    "seccion": "Other research outputs",
    "sub": null,
    "clave": "or",
    "preguntas": [
      {
        "id": "or1",
        "t": "In addition to the management of data, beneficiaries should also consider and plan for the management of other research outputs that may be generated or re-used throughout their projects. Such outputs can be either digital (e.g. software, workflows, protocols, models, etc.) or physical (e.g. new materials, antibodies, reagents, samples, etc.).",
        "t_es": "Además de la gestión de los datos, los beneficiarios deben considerar y planificar la gestión de otros resultados de investigación que puedan generarse o reutilizarse a lo largo del proyecto. Estos resultados pueden ser digitales (por ejemplo, software, flujos de trabajo, protocolos, modelos, etc.) o físicos (por ejemplo, nuevos materiales, anticuerpos, reactivos, muestras, etc.)."
      },
      {
        "id": "or2",
        "t": "Beneficiaries should consider which of the questions pertaining to FAIR data above, can apply to the management of other research outputs, and should strive to provide sufficient detail on how their research outputs will be managed and shared, or made available for re-use, in line with the FAIR principles.",
        "t_es": "Los beneficiarios deben considerar cuáles de las cuestiones anteriores sobre datos FAIR pueden aplicarse a la gestión de otros resultados de investigación, y procurar detallar suficientemente cómo se gestionarán y compartirán dichos resultados, o cómo se pondrán a disposición para su reutilización, conforme a los principios FAIR."
      }
    ],
    "seccion_es": "Otros resultados de investigación",
    "sub_es": null
  },
  {
    "seccion": "Allocation of resources",
    "sub": null,
    "clave": "re",
    "preguntas": [
      {
        "id": "re1",
        "t": "What will the costs be for making data or other research outputs FAIR in your project (e.g. direct and indirect costs related to storage, archiving, re-use, security, etc.) ?",
        "t_es": "¿Cuáles serán los costes de hacer FAIR los datos u otros resultados de investigación del proyecto (por ejemplo, costes directos e indirectos de almacenamiento, archivo, reutilización, seguridad, etc.)?"
      },
      {
        "id": "re2",
        "t": "How will these be covered? Note that costs related to research data/output management are eligible as part of the Horizon Europe grant (if compliant with the Grant Agreement conditions)",
        "t_es": "¿Cómo se cubrirán? Tenga en cuenta que los costes de gestión de los datos y de los resultados de investigación son subvencionables con cargo a la ayuda de Horizon Europe, si cumplen las condiciones del acuerdo de subvención."
      },
      {
        "id": "re3",
        "t": "Who will be responsible for data management in your project?",
        "t_es": "¿Quién será responsable de la gestión de los datos en el proyecto?"
      },
      {
        "id": "re4",
        "t": "How will long term preservation be ensured? Discuss the necessary resources to accomplish this (costs and potential value, who decides and how, what data will be kept and for how long)?",
        "t_es": "¿Cómo se garantizará la preservación a largo plazo? Analice los recursos necesarios para ello (costes y valor potencial, quién decide y cómo, qué datos se conservarán y durante cuánto tiempo)."
      }
    ],
    "seccion_es": "Asignación de recursos",
    "sub_es": null
  },
  {
    "seccion": "Data security",
    "sub": null,
    "clave": "se",
    "preguntas": [
      {
        "id": "se1",
        "t": "What provisions are or will be in place for data security (including data recovery as well as secure storage/archiving and transfer of sensitive data)?",
        "t_es": "¿Qué medidas existen o existirán para la seguridad de los datos (incluidas la recuperación de datos y el almacenamiento, archivo y transferencia seguros de datos sensibles)?"
      },
      {
        "id": "se2",
        "t": "Will the data be safely stored in trusted repositories for long term preservation and curation?",
        "t_es": "¿Se almacenarán los datos de forma segura en repositorios de confianza para su preservación y conservación a largo plazo?"
      }
    ],
    "seccion_es": "Seguridad de los datos",
    "sub_es": null
  },
  {
    "seccion": "Ethics",
    "sub": null,
    "clave": "et",
    "preguntas": [
      {
        "id": "et1",
        "t": "Are there, or could there be, any ethics or legal issues that can have an impact on data sharing? These can also be discussed in the context of the ethics review. If relevant, include references to ethics deliverables and ethics chapter in the Description of the Action (DoA).",
        "t_es": "¿Existen, o podrían existir, cuestiones éticas o legales que puedan afectar a la compartición de los datos? Pueden tratarse también en el marco de la evaluación ética. Si procede, incluya referencias a los entregables de ética y al capítulo de ética de la descripción de la acción (DoA)."
      },
      {
        "id": "et2",
        "t": "Will informed consent for data sharing and long term preservation be included in questionnaires dealing with personal data?",
        "t_es": "¿Se incluirá el consentimiento informado para la compartición de los datos y su preservación a largo plazo en los cuestionarios que traten datos personales?"
      }
    ],
    "seccion_es": "Aspectos éticos",
    "sub_es": null
  },
  {
    "seccion": "Other issues",
    "sub": null,
    "clave": "oi",
    "preguntas": [
      {
        "id": "oi1",
        "t": "Do you, or will you, make use of other national/funder/sectorial/departmental procedures for data management? If yes, which ones (please list and briefly describe them)?",
        "t_es": "¿Utiliza o utilizará otros procedimientos nacionales, del financiador, sectoriales o departamentales para la gestión de datos? En caso afirmativo, ¿cuáles? Enumérelos y descríbalos brevemente."
      }
    ],
    "seccion_es": "Otras cuestiones",
    "sub_es": null
  }
];
