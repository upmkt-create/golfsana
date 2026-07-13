import React, { useState, useMemo } from "react";
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Shield, 
  Sliders, 
  Printer, 
  Zap,  
  FileText, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  Users
} from "lucide-react";

interface UserManualDashboardProps {
  currentUser: {
    name: string;
    email: string;
    role: string;
  };
}

export default function UserManualDashboard({ currentUser }: UserManualDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("intro");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedRoleGuide, setSelectedRoleGuide] = useState<string>(
    currentUser.role === "admin" ? "admin" : "member"
  );

  // Raw data for the manual
  const manualSections = useMemo(() => [
    {
      id: "intro",
      title: "1. Introducció a GolfSana",
      category: "general",
      icon: BookOpen,
      content: `GolfSana és una plataforma enterprise dissenyada específicament per a la coordinació d'operacions del Club de Golf d'Aro. Fusiona la potència de gestió de projectes d'Asana amb un potent mòdul de Monitorització i Comparació de Tarifes de Golf davant els nostres rivals directes.

L'objectiu principal és assegurar que tot l'equip estigui sincronitzat en temps real, que les tasques de manteniment, vendes, màrqueting i administració estiguin clares, i que puguem reaccionar de manera àgil als mètodes de preus dinàmics de la competència (Empordà Golf, PGA Catalunya, Real Club de Golf El Prat).`
    },
    {
      id: "workspace-asana",
      title: "2. Com utilitzar l'Espai de Treball (Asana)",
      category: "asana",
      icon: Sliders,
      content: `L'espai de treball de GolfSana funciona de manera similar a Asana, però adaptat a les necessitats d'un club de golf.
      
• Creació de Tasques: Podeu crear tasques assignant un departament específic (Màrqueting, Comercial, Escoles, Reserves, Administració), data d'inici i venciment, nivell de prioritat (Urgent, Alta, Mitjana, Baixa) i recurrència per automatitzar fluxos periòdics.
• Vistes del Projecte:
  - Resum (Tab Summary): Una visió executiva d'alt nivell de les tasques i avenços del projecte actiu.
  - Llista (Tab List): Format taula excel on és molt ràpid editar prioritzacions, estats o dates límit de venciment de forma lamel·lar.
  - Base del Projecte (Tab nou): Mostra només les tasques marcades amb l'estrella ⭐ com a "estructurals" del projecte (a diferència de les puntuals o recurrents). Per marcar una tasca com a Base, clica l'estrella al costat del títol, tant al llistat com al detall de la tasca. Al Kanban, aquestes targetes es distingeixen amb un anell daurat i la mateixa estrella.
  - Kanban (Tab Board): Flux visual organitzat per l'estat actual del procés ("Pendent", "En Curs", "Sota Revisió", "Completat"). Perfecte per fer reunions setmanals de coordinació.
  - Calendari (Tab Timeline): Planificació temporal dinàmica i interactiva. Ara és compatible amb rangs multidia (mostrant la duració sencera per a tasques des de la seva data d'inici fins a la data límit en lloc d'un bloc curt d'una sola hora), la qual cosa evita el solapament d'esdeveniments comercials crítics, auditories o tasques mecàniques del camp.
• Subtasques: Si una tasca té subtasques, apareix una fletxa (▶) al costat del títol al Llistat. Clicant-hi es desplega la llista de subtasques, ordenades automàticament per data de venciment. Des d'allà mateix podeu veure i editar el responsable assignat, la prioritat, i portar un cronòmetre propi de temps treballat per cada subtasca (independent del cronòmetre de la tasca principal).
• Descripcions amb format: El quadre de descripció de tasques i projectes admet ara text amb estil — negreta, cursiva, mides de lletra, llistes amb vinyetes o numerades, i checklists amb caselles clicables. La barra d'eines apareix a sobre del quadre de text en editar.
• Navegació ràpida: A la capçalera superior, el nom de l'espai de treball (per exemple "Esportiu" a "Esportiu > E-Acords Camps") és clicable — hi torna directament sense haver de passar pel menú lateral.`
    },
    {
      id: "meeting-minutes",
      title: "3. Actes de Reunió",
      category: "asana",
      icon: FileText,
      content: `Les Actes de Reunió permeten registrar el que s'acorda a cada reunió individual entre Rocío/Direcció i cada membre de l'equip.

• Creació: Els administradors creen una acta nova indicant el membre, la data de la reunió, notes de context, i una llista d'acords/tasques concretes, cadascun amb data límit opcional i marca de "seguiment setmanal" si és recurrent.
• Edició: Per editar una acta ja creada, cliqueu "Editar" — el formulari apareix allà mateix, a sobre de l'acta, sense necessitat de desplaçar-vos a dalt de la pàgina.
• Filtres: Es poden filtrar les actes per persona (només administradors) i per rang de data de creació, amb el botó "Filtres" de la capçalera.
• Conversió a tasca: Cada membre pot convertir un dels seus propis acords en una tasca real amb el botó "Crear tasca". Un cop creada, l'acord mostra l'etiqueta verda "Tasca creada".
• Seguiment de compliment: Quan aquesta tasca es marca com a completada (des de qualsevol vista de GolfSana), l'acta ho reflecteix automàticament amb una etiqueta vermella "Tasca completada", i el text de l'acord apareix ratllat. No cal fer res manualment — l'estat es llegeix en directe de la tasca vinculada.
• Notificacions: Cada membre només veu les seves pròpies actes, i rep una notificació (campaneta "Mencions") quan se li crea o modifica una acta.`
    },
    {
      id: "golf-monitor",
      title: "4. Monitor de Tarifes i Comparador",
      category: "golf",
      icon: TrendingUp,
      content: `El cor competitiu de GolfSana és el Comparador de Tarifes de Golf:

• Lectura en Temps Real: Mostra de forma constant el preu per hora del Green Fee (alta i baixa temporada), el lloguer de Buggies i de llicències de pals de Golf d'Aro davant rivals d'alta ocupació.
• Font de dades: El comparador intenta llegir dades en directe (preus i disponibilitat real) directament del sistema de reserves GolfManager de cada camp. Cada resultat indica la seva font: "live" quan són dades reals d'aquell moment, o "model" quan s'utilitza la base de tarifes verificada com a alternativa fiable (per exemple, si un camp bloqueja temporalment l'accés extern).
• Simulador de Tarifes per Hores: Proporciona un visor interactiu per hores del dia actual amb un gràfic comparatiu, incloent el percentatge d'ocupació/disponibilitat de cada franja horària.
• Enllaços Directes: Disposa de botons de redirecció directa als widgets oficials de Golf Manager per fer reserves de sortida de forma directa davant clients.
• Estat de Sincronització: Indica quan s'ha fet l'última sincronització de dades. Els administradors tenen la capacitat de llançar un "Scraping de Forçat" per recalcular l'estat del mercat immediatament.`
    },
    {
      id: "users-roles",
      title: "5. Gestió de Membres i Drets d'Alta",
      category: "security",
      icon: Users,
      content: `La plataforma disposa d'un sistema d'usuaris per un màxim rendiment amb llicència il·limitada "Enterprise":

• Administradors (Isabel o Rocío): Tenen accés a la càrrega de dades, creació d'usuaris definits/indefinits, gestió de tarifes competitives, polítiques d'incentius globals i panells de seguretat avançats.
• Membres de l'Equip (Marc, Erika, Ester, Mònica, Saba, etc.): Tenen accés a gestionar, moure i completar les seves tasques operatives, comentar amb adjunts i consultar el simulador de preus. Per exemple, la Saba s'incorpora com a membre flotant (sense departament exclusiu inicial) per donar suport global o dur a terme tasques transversals.
• Com afegir usuaris: Un administrador pot anar a la capçalera (selector d'usuaris superior dalt a la dreta) i utilitzar la funció "Afegeix Usuari Indefinit" per donar d'alta immediatament nous perfils associats al seu de departament de destinació.`
    },
    {
      id: "incentives-metrics",
      title: "6. Rendiment, Mètriques i Incentius",
      category: "metrics",
      icon: Clock,
      content: `La finalització de tasques col·labora en el creixement del club i la compensació de l'equip:

• Model d'Incentiu Trimestral de 150€ (Proporcional): Exclusiu de la Rocío i la Isabel. Cada persona compta amb un fons variable de recompensa trimestral d'un màxim de 150€. L'import definitiu a percebre es calcula en part proporcional segons el % de tasques finals acabades sobre les totals que tenien assignades.
• Model Variable per Tasca (Alternatiu): Mètode que valora de forma individual cada esdeveniment tancat a temps amb multiplicadors editables en temps real.
• Informes i Dashboards: Gràfiques interactives en temps real de productivitat, evolució de projectes i càrrega repartida per departament.`
    },
    {
      id: "offline-redundancy",
      title: "7. Mode de Seguretat i Sincronització Redundada",
      category: "security",
      icon: Shield,
      content: `Per garantir l'operació diària fins i tot a les zones més allunyades del camp de golf, GolfSana incorpora un Mode de Redundància i Sincro Segura:

• Execució Local Sandbox: Si la xarxa no té prou potència, l'aplicació manté els canvis funcionals de manera local (local storage) de forma blindada.
• Sincronització en Temps Real: Un cop la connexió és estable, el canal dinàmic amb Firestore (Cloud) actualitza el flux d'activitat i actualitza els canvis a les pantalles de la resta de membres de l'equip.
• Polítiques de Registres i Audit: Cada inici de sessió, canvi de tasca o descàrrega de dades és degudament gravada i identificada de forma immutable per complir amb les directrius d'auditories enterprise.`
    }
  ], []);

  // FAQ data in Catalan
  const faqs = useMemo(() => [
    {
      question: "Per què la pantalla de vegades canvia a Mode SandBox?",
      answer: "GolfSana inclou un motor de prevenció que evita la pèrdua d'informació operativa pel personal de camp. Si hi ha talls temporals de connexió, l'aplicació continua funcionant localment i sincronitza automàticament tot el contingut en recuperar l'accés cloud."
    },
    {
      question: "Com puc assignar una mateixa tasca a diversos departaments?",
      answer: "En editar o crear una tasca, s'inclou un selector d'àrees de treball múltiples. Si la tasca afecta tant a reserves de camp com a l'escola, podeu marcar múltiples caselles de departaments perquè aparegui en ambdós fluxos simultàniament."
    },
    {
      question: "Com funciona el web scraping de la competència?",
      answer: "Es tracta d'un simulador controlat adaptiu que replica com la plataforma llegeix les pàgines de reserves públiques dels nostres competidors (Empordà Golf, PGA Catalunya, Real Club de Golf El Prat) per extreure les seves millors ofertes d'un bugui o green fee segons temporada i hora de l'audiència."
    },
    {
      question: "Es poden importar o exportar les tasques de GolfSana?",
      answer: "Sí. Tot departament compta amb vistes de descàrrega. A més, a la taula 'Seguretat i Registres' o 'Monitorització' els administradors poden visualitzar totes les auditories oficials de canvis de l'equip."
    },
    {
      question: "Com es representen les tasques amb rangs de més d'un dia al Calendari/Timeline?",
      answer: "Si una tasca té assignada una data d'inici i una data de venciment (límit), el Calendari pintarà automàticament aquesta barra reflectint la durada exacta en lloc d'un bloc genèric d'una hora. Això us permet visualitzar millor la càrrega de treball setmanal."
    },
    {
      question: "Qui dóna suport tècnic en cas d'incidència oficial?",
      answer: "L'equip d'UP! Marketing Digital és l'administrador i mantenidor oficial tecnològic de la plataforma per al Club de Golf d'Aro. Per a incidències o canvis funcionals, es pot demanar atenció directament."
    }
  ], []);

  // Role details guide mapping
  const roleGuides = useMemo(() => ({
    admin: {
      title: "Pla de Treball per a Administradors (Isabel, Rocío, Direcció)",
      brief: "Com a administrador/a, disposes d'un control transversal sobre l'operació del golf i els preus comercials d'Asana d'alt nivell.",
      steps: [
        "Fer seguiment individual: Crea una Acta de Reunió després de cada trobada amb un membre de l'equip, amb els acords concrets. Cada membre rep notificació i només veu les seves pròpies actes.",
        "Llançar actualitzacions de tarifes: Ves a la secció d'Anàlisi i utilitza l'Scrape manual forçat de preus competidors.",
        "Gestionar personal: Utilitza el selector d'usuaris per afegir membres indefinit de l'equip i controlar auditories.",
        "Aprovar incentius: Revisa el tauler de rendiment per verificar els indicadors mensuals de cada àrea (Màrqueting, Comercial, etc.).",
        "Supervisar la seguretat: Consulta els registres d'activitat per realitzar auditories completes de sistema en temps real."
      ]
    },
    member: {
      title: "Guia d'Operacions per a l'Equip de Gestió (Marc, Erika, Ester, Mònica, Saba, etc.)",
      brief: "El vostre focus és mantenir activa l'excel·lència operativa de la marca i el servei al client directament.",
      steps: [
        "Revisar les vostres Actes de Reunió: Consulteu la pestanya d'Actes per veure els acords de la darrera reunió amb Rocío/Direcció, i convertiu els que calgui en tasques reals amb el botó 'Crear tasca'.",
        "Mantenir el tauler actualitzat: Moveu les tasques diàries al Kanban de 'En curs' o 'Sota Revisió' perquè la direcció conegui l'estat d'ocupació.",
        "Marcar les hores i venciments: Intenteu obrir i tancar tasques dins de les dates certificades per acumular el bonus d'incentius setmanals.",
        "Adjuntar fitxers i comentaris: Feu servir el cercador de la dreta a la fitxa de cada tasca per registrar incidències, contractes o correus lamel·lars amb un sol clic.",
        "Consultar el monitor de preus: Abans d'establir un preu de sortida presencial a recepció, comproveu les tarifes canviants de la competència en la pestanya de Golf Monitor."
      ]
    }
  }), []);

  // Search logic for simple highlighting of sections
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return manualSections;
    const query = searchQuery.toLowerCase();
    return manualSections.filter(
      section => 
        section.title.toLowerCase().includes(query) || 
        section.content.toLowerCase().includes(query)
    );
  }, [searchQuery, manualSections]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800" id="user-manual-view">
      {/* Title section with support stamp */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-[10px] bg-emerald-600 text-white font-mono font-extrabold px-2.5 py-0.5 tracking-wider uppercase">
            Manual Oficial d'Usuari
          </span>
          <h2 className="text-xl font-extrabold tracking-tight uppercase text-slate-900 mt-1.5">
            Centre de Suport i Guia de GolfSana
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manual complet de coordinació d'operacions d'Asana Enterprise i comparador de tarifes corporatives per al Club de Golf d'Aro.
          </p>
        </div>
        
        {/* Support by UP! Marketing Digital Stamp */}
        <div className="bg-slate-50 border border-slate-200 p-2 px-3 text-right shrink-0">
          <p className="text-[9px] font-mono text-slate-400 font-bold uppercase">Tecnologia Certificada</p>
          <p className="text-xs font-bold text-indigo-600">UP! Marketing Digital</p>
          <span className="text-[9.5px] text-slate-500 font-medium">Sincronització SOC-2 de Seguretat</span>
        </div>
      </div>

      {/* Grid of Manual */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Table of contents & Interactive Role selector */}
        <div className="lg:col-span-1 space-y-6 shrink-0 print:hidden">
          {/* Internal search */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Cerca al manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-white text-slate-800 border border-slate-350 pr-8 pl-3 py-2 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-[11px]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2" />
          </div>

          {/* Chapters Navigation */}
          <div className="bg-white border border-slate-200">
            <div className="bg-slate-550 border-b border-slate-200 p-3 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-600 font-mono tracking-wider uppercase block">
                Capítols del Manual
              </span>
            </div>
            <div className="divide-y divide-slate-100 flex flex-col text-xs font-medium">
              {filteredSections.map((sec) => {
                const SecIcon = sec.icon;
                const isSelected = selectedSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedSection(sec.id);
                      const element = document.getElementById(`section-${sec.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    className={`p-3 text-left w-full transition-all flex items-center justify-between group ${
                      isSelected 
                        ? "bg-slate-100/80 text-indigo-900 border-l-4 border-l-indigo-600 font-bold" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <SecIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 text-slate-400 shrink-0 ${isSelected ? "translate-x-1" : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick interactive roles cheatsheet widget */}
          <div className="bg-gradient-to-br from-[#022e5f] to-indigo-950 text-white p-4 border border-indigo-900 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-wider font-extrabold text-blue-200 uppercase">
                Guia Ràpida Per Rol de l'Equip
              </span>
            </div>

            <p className="text-[11px] text-blue-100/90 leading-relaxed mb-4">
              Cada perfil té un mètode de treball diferenciat segons el seu nivell d'accés tecnològic:
            </p>

            {/* Role selector buttons */}
            <div className="flex border border-indigo-800 bg-black/10 text-[10px] font-bold uppercase mb-4">
              <button
                onClick={() => setSelectedRoleGuide("admin")}
                className={`flex-1 py-1.5 text-center transition-all ${
                  selectedRoleGuide === "admin"
                    ? "bg-indigo-600 text-white"
                    : "text-blue-200 hover:bg-indigo-900/30"
                }`}
              >
                Isabel / Rocío
              </button>
              <button
                onClick={() => setSelectedRoleGuide("member")}
                className={`flex-1 py-1.5 text-center transition-all ${
                  selectedRoleGuide === "member"
                    ? "bg-indigo-600 text-white"
                    : "text-blue-200 hover:bg-indigo-900/30"
                }`}
              >
                Marc, Erika, etc.
              </button>
            </div>

            {/* Selected guide details widget */}
            <div className="bg-black/30 p-3 border border-indigo-800/40 space-y-2">
              <h5 className="text-[11px] font-extrabold uppercase text-emerald-300 tracking-tight leading-tight">
                {roleGuides[selectedRoleGuide as keyof typeof roleGuides].title}
              </h5>
              <p className="text-[10.5px] text-blue-200/90 leading-normal">
                {roleGuides[selectedRoleGuide as keyof typeof roleGuides].brief}
              </p>
              <ul className="text-[10px] space-y-2 text-white/80 list-decimal list-inside pl-0.5 pt-1.5 border-t border-indigo-905 mt-1">
                {roleGuides[selectedRoleGuide as keyof typeof roleGuides].steps.map((st, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="text-white font-medium">{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick trigger to open browser print */}
          <button
            onClick={() => window.print()}
            className="w-full py-2 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 bg-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Manual d'Ús</span>
          </button>
        </div>

        {/* Right Side: Render Manual Chapters (collapsible or single stream) + FAQs */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Primary stream of sections */}
          <div className="bg-white border border-slate-200 p-6 space-y-8 select-all">
            {filteredSections.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-sm">No s'ha trobat cap secció</p>
                <p className="text-xs">Proveu a buscar altres termes com 'Scraping', 'Asana' o 'Mode'.</p>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const SecIcon = sec.icon;
                return (
                  <div 
                    id={`section-${sec.id}`}
                    key={sec.id}
                    className="space-y-3.5 scroll-mt-24 border-b border-slate-100 last:border-0 pb-6 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5 pb-2 border-b border-indigo-50/50">
                      <div className="w-8 h-8 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <SecIcon className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                        {sec.title}
                      </h3>
                    </div>

                    <div className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap font-sans">
                      {sec.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FAQs Accordion */}
          <div className="bg-white border border-slate-200 p-6 space-y-4 print:break-before-page">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-5 h-5 text-indigo-600 stroke-[2]" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-950">
                Preguntes Freqüents (FAQ)
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-normal pb-2">
              Respostes a les qüestions més habituals que sorgeixen en el transcurs diari del negoci dins la plataforma GolfSana:
            </p>

            <div className="divide-y divide-slate-150 border border-slate-200">
              {faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="bg-slate-50/20">
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-3 px-4 text-xs font-bold text-slate-800 hover:bg-slate-50 text-left transition-all outline-none"
                    >
                      <span className="pr-4">{faq.question}</span>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 px-5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact with UP! Marketing Digital & Corporate stamp */}
          <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-950 font-mono">Precisament més ajuda o gestió amb el portal?</h4>
              <p className="text-[11px] text-indigo-750 max-w-xl">
                GolfSana és de propietat intel·lectual exclusiva d'UP! Marketing Digital dissenyada per a l'ús restringit de l'equip del Club de Golf d'Aro. El sistema monitoritza canvis per seguretat.
              </p>
            </div>
            
            <a 
              href="mailto:info@up-mktdigital.com"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
              title="Clica per escriure un correu directament"
            >
              <span>Contacta Suport</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
