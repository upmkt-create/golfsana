import { GolfCourse, UserProfile, Workspace, Project, Task } from "./types";

export const STARTER_GOLF_CORES: Omit<GolfCourse, "id">[] = [
  {
    name: "Club Golf d'Aro - Mas Nou",
    location: "Castell-Platja d'Aro, Girona",
    url: "https://www.golfdaro.com/",
    bookingUrl: "https://eu.golfmanager.com/golfdaro/consumer/book?area=3&date=2026-06-23T00%3A00&resource=16",
    bookingSystem: "Golf Manager",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: true,
    greenFeeHigh: 115,
    greenFeeLow: 75,
    buggyRental: 48,
    clubRental: 45,
    hourlyRates: {
      "07:00-08:00": 92,
      "08:00-12:00": 115,
      "12:00-13:00": 110,
      "13:00-14:00": 104,
      "14:00-15:00": 98,
      "15:00-16:00": 92,
      "16:00-21:00": 75
    },
    hourlyTariffs: {
      "07:00-08:00": "GF 18 - 4 players -20%",
      "08:00-12:00": "GF 18 Forats",
      "12:00-13:00": "GF 18 Forats -4%",
      "13:00-14:00": "GF 18 Forats -10%",
      "14:00-15:00": "GF 18 Forats -15%",
      "15:00-16:00": "GF 18 Forats -20%",
      "16:00-21:00": "GF All You Can Play"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 64,
    reservationsToday: 128,
    availableSlotsToday: 16,
    teeTimeInterval: 9
  },
  {
    name: "Golf de Pals",
    location: "Pals, Girona",
    url: "https://www.golfdepals.com/",
    bookingUrl: "https://open.teeone.golf/es/platjadepals/disponibilidad",
    bookingSystem: "Tee One",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 125,
    greenFeeLow: 80,
    buggyRental: 48,
    clubRental: 45,
    hourlyRates: {
      "07:00-08:00": 100,
      "08:00-12:00": 125,
      "12:00-13:00": 115,
      "13:00-14:00": 105,
      "14:00-15:00": 95,
      "15:00-16:00": 90,
      "16:00-21:00": 80
    },
    hourlyTariffs: {
      "07:00-08:00": "PALS - 18 HOYOS ADULTO",
      "08:00-12:00": "PALS - 18 HOYOS ADULTO",
      "12:00-13:00": "PALS - 18 HOYOS ADULTO",
      "13:00-14:00": "PALS - 18 HOYOS ADULTO",
      "14:00-15:00": "PALS - 18 HOYOS ADULTO",
      "15:00-16:00": "18 HOYOS TWILIGHT",
      "16:00-21:00": "18 HOYOS TWILIGHT"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 82,
    reservationsToday: 164,
    availableSlotsToday: 8,
    teeTimeInterval: 10
  },
  {
    name: "Empordà Golf Club",
    location: "Gualta, Girona",
    url: "https://www.empordagolf.com/",
    bookingUrl: "https://eu.golfmanager.com/emporda/consumer/book?area=1&date=2026-06-11T00%3A00&resource=1",
    bookingSystem: "Golf Manager",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 110,
    greenFeeLow: 70,
    buggyRental: 45,
    clubRental: 40,
    hourlyRates: {
      "07:00-08:00": 90,
      "08:00-12:00": 110,
      "12:00-13:00": 100,
      "13:00-14:00": 95,
      "14:00-15:00": 75,
      "15:00-16:00": 75,
      "16:00-21:00": 75
    },
    hourlyTariffs: {
      "07:00-08:00": "GF 18 HOLES FOREST",
      "08:00-12:00": "GF 18 HOLES FOREST",
      "12:00-13:00": "GF 18 HOLES FOREST",
      "13:00-14:00": "GF 18 HOLES FOREST",
      "14:00-15:00": "GF ALL YOU CAN PLAY FOREST",
      "15:00-16:00": "GF ALL YOU CAN PLAY FOREST",
      "16:00-21:00": "GF ALL YOU CAN PLAY FOREST"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 73,
    reservationsToday: 146,
    availableSlotsToday: 12,
    teeTimeInterval: 10
  },
  {
    name: "Golf Costa Brava",
    location: "Santa Cristina d'Aro, Girona",
    url: "https://golfcostabrava.com/",
    bookingUrl: "https://open.teeone.golf/en/costa-brava/disponibilidad",
    bookingSystem: "Tee One",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 105,
    greenFeeLow: 70,
    buggyRental: 42,
    clubRental: 40,
    hourlyRates: {
      "07:00-08:00": 85,
      "08:00-12:00": 105,
      "12:00-13:00": 98,
      "13:00-14:00": 92,
      "14:00-15:00": 85,
      "15:00-16:00": 80,
      "16:00-21:00": 70
    },
    hourlyTariffs: {
      "07:00-08:00": "18 holes",
      "08:00-12:00": "18 holes",
      "12:00-13:00": "18 holes",
      "13:00-14:00": "18 holes",
      "14:00-15:00": "18 holes",
      "15:00-16:00": "18 holes Sun Hour",
      "16:00-21:00": "18 holes Sun Hour"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 58,
    reservationsToday: 116,
    availableSlotsToday: 19,
    teeTimeInterval: 9
  },
  {
    name: "Camiral Golf & Wellness (Stadium Course)",
    location: "Caldes de Malavella, Girona",
    url: "https://www.camiral.com/ca",
    bookingUrl: "https://golf.camiral.com/camiral/consumer/book?area=1&date=2026-07-09T00%3A00&resourceType=1",
    bookingSystem: "Golf Manager / Propi",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 215,
    greenFeeLow: 139,
    buggyRental: 55,
    clubRental: 65,
    hourlyRates: {
      "07:00-08:00": 191.5,
      "08:00-12:00": 215,
      "12:00-13:00": 215,
      "13:00-14:00": 215,
      "14:00-15:00": 215,
      "15:00-16:00": 191.5,
      "16:00-21:00": 139
    },
    hourlyTariffs: {
      "07:00-08:00": "Stadium Course",
      "08:00-12:00": "Stadium Course",
      "12:00-13:00": "Stadium Course",
      "13:00-14:00": "Stadium Course",
      "14:00-15:00": "Stadium Course",
      "15:00-16:00": "Stadium Course",
      "16:00-21:00": "Stadium Course"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 91,
    reservationsToday: 182,
    availableSlotsToday: 4,
    teeTimeInterval: 10
  },
  {
    name: "Torremirona Golf Club",
    location: "Navata, Girona",
    url: "https://www.golftorremirona.com/",
    bookingUrl: "https://eu.golfmanager.com/golftorremirona/consumer/book?area=3&date=2026-06-23T00%3A00&resource=16",
    bookingSystem: "Golf Manager",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 107,
    greenFeeLow: 82,
    buggyRental: 42,
    clubRental: 38,
    hourlyRates: {
      "07:00-08:00": 83,
      "08:00-12:00": 107,
      "12:00-13:00": 81,
      "13:00-14:00": 81,
      "14:00-15:00": 75,
      "15:00-16:00": 75,
      "16:00-21:00": 52
    },
    hourlyTariffs: {
      "07:00-08:00": "GF 18 - Earlybird",
      "08:00-12:00": "GF 18 Forats",
      "12:00-13:00": "GF 18 - Summer Fee",
      "13:00-14:00": "GF 18 - Summer Fee",
      "14:00-15:00": "GF 18 - Twilight",
      "15:00-16:00": "GF 18 - Twilight",
      "16:00-21:00": "GF 18 - All You Can Play"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 30.5,
    reservationsToday: 61,
    availableSlotsToday: 139,
    teeTimeInterval: 10
  },
  {
    name: "Camp de Golf Perelada",
    location: "Peralada, Girona",
    url: "https://www.golfperalada.com/",
    bookingUrl: "https://open.teeone.golf/es/peralada/disponibilidad",
    bookingSystem: "Tee One",
    syncStatus: "success",
    lastSyncTime: "Avui, 04:00 AM",
    isOurClub: false,
    greenFeeHigh: 120,
    greenFeeLow: 80,
    buggyRental: 45,
    clubRental: 40,
    hourlyRates: {
      "07:00-08:00": 95,
      "08:00-12:00": 120,
      "12:00-13:00": 105,
      "13:00-14:00": 98,
      "14:00-15:00": 90,
      "15:00-16:00": 85,
      "16:00-21:00": 80
    },
    hourlyTariffs: {
      "07:00-08:00": "GREEN FEE 18 Hoyos",
      "08:00-12:00": "GREEN FEE 18 Hoyos",
      "12:00-13:00": "GREEN FEE 18 Hoyos",
      "13:00-14:00": "GREEN FEE 18 Hoyos",
      "14:00-15:00": "GREEN FEE 18 Hoyos",
      "15:00-16:00": "GREEN FEE 18 Hoyos",
      "16:00-21:00": "GREEN FEE 18 Hoyos"
    },
    updatedBy: "Scraper Automàtic",
    occupancyToday: 52,
    reservationsToday: 104,
    availableSlotsToday: 96,
    teeTimeInterval: 10
  }
];

export const DEPARTMENTS = [
  { id: "dep-esportiu", name: "Esportiu", description: "Organització de tornejos, campionats de socis i activitats del Club.", color: "#3B82F6" },
  { id: "dep-comercial", name: "Comercial", description: "Vendes de green fees, abonaments de socis i esdeveniments corporatius.", color: "#EF4444" },
  { id: "dep-pitch-putt", name: "Pitch & Putt", description: "Gestió, reserves, tornejos del recorregut i escola de Pitch&Putt.", color: "#0D9488" },
  { id: "dep-marqueting", name: "Màrqueting", description: "Disseny gràfic, campanyes digitals, gestió de web i xarxes socials.", color: "#F59E0B" }
];

export const STARTER_MEMBERS: UserProfile[] = [
  {
    id: "member_isabel",
    name: "Isabel",
    email: "info@up-mktdigital.com",
    role: "admin",
    avatar: "I",
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial", "dep-comercial", "dep-marqueting", "dep-esportiu", "dep-comercial", "dep-pitch-putt", "dep-comercial"],
    accessCode: "1011923Aipa"
  },
  {
    id: "member_rocio",
    name: "Rocío",
    email: "rocio@golfdaro.com",
    role: "admin",
    avatar: "R",
    departmentId: "dep-pitch-putt",
    departmentIds: ["dep-comercial", "dep-comercial", "dep-marqueting", "dep-esportiu", "dep-comercial", "dep-pitch-putt", "dep-comercial"],
    accessCode: "ADMIN-ROCIO-2026"
  },
  {
    id: "member_marc",
    name: "Marc",
    email: "marc@golfdaro.com",
    role: "member",
    avatar: "M",
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    accessCode: "MARC-2026"
  },
  {
    id: "member_erika",
    name: "Erika",
    email: "erika@golfdaro.com",
    role: "member",
    avatar: "E",
    departmentId: "dep-marqueting",
    departmentIds: ["dep-marqueting"],
    accessCode: "ERIKA-2026"
  },
  {
    id: "member_ester",
    name: "Ester",
    email: "ester@golfdaro.com",
    role: "member",
    avatar: "ES",
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu", "dep-pitch-putt"],
    accessCode: "ESTER-2026"
  },
  {
    id: "member_monica",
    name: "Mònica",
    email: "monica@golfdaro.com",
    role: "member",
    avatar: "MO",
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    accessCode: "MONICA-2026"
  },
  {
    id: "member_marina",
    name: "Marina",
    email: "marina@golfdaro.com",
    role: "member",
    avatar: "MA",
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    accessCode: "MARINA-2026"
  },
  {
    id: "member_saba",
    name: "Saba",
    email: "saba@golfdaro.com",
    role: "member",
    avatar: "S",
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    accessCode: "SABA-2026"
  }
];

export const STARTER_WORKSPACES: Workspace[] = [
  {
    id: "dep-esportiu",
    name: "Esportiu",
    description: "Organització de tornejos, campionats de socis i activitats del Club.",
    createdAt: new Date().toISOString()
  },
  {
    id: "dep-comercial",
    name: "Comercial",
    description: "Vendes de green fees, abonaments de socis i esdeveniments corporatius.",
    createdAt: new Date().toISOString()
  },
  {
    id: "dep-pitch-putt",
    name: "Pitch & Putt",
    description: "Gestió, reserves, tornejos del recorregut i escola de Pitch&Putt.",
    createdAt: new Date().toISOString()
  },
  {
    id: "dep-marqueting",
    name: "Màrqueting",
    description: "Disseny gràfic, campanyes digitals, gestió de web i xarxes socials.",
    createdAt: new Date().toISOString()
  }
];

export const STARTER_PROJECTS: Project[] = [
  {
    id: "proj-torneig-primavera",
    workspaceId: "dep-esportiu",
    name: "Torneig de Primavera 2026",
    color: "#3B82F6", // Blue
    description: "Organització de la competició corporativa anual per a patrocinadors i socis nacionals.",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-manteniment-green",
    workspaceId: "dep-comercial",
    name: "Millora Tècnica de Greens",
    color: "#10B981", // Emerald
    description: "Re-sembrat i millora del sistema de drenatge d'aigua als forats 9 i 18 del camp principal.",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-social-media",
    workspaceId: "dep-marqueting",
    name: "Campanya Estiu & Paquets de Golf",
    color: "#F59E0B", // Amber
    description: "Promoció digital dels nous abonaments de cap de setmana combinats amb allotjament.",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-botiga-estoc",
    workspaceId: "dep-comercial",
    name: "Renovació Col·lecció Estiu Shop",
    color: "#8B5CF6", // Purple
    description: "Actualització de l'inventari tècnic de pals de lloguer i liquidació d'estocs anteriors.",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-lliga-pitch-putt",
    workspaceId: "dep-pitch-putt",
    name: "Lliga Local Pitch & Putt 2026",
    color: "#0D9488",
    description: "Competició bimensual de Pitch&Putt oberta a socis de totes les categories i nivells.",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-proshop",
    workspaceId: "dep-esportiu",
    name: "E-Proshop",
    color: "#3B82F6",
    description: "Gestió i organització de la Proshop",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-patrociinis",
    workspaceId: "dep-esportiu",
    name: "E-Patrociinis",
    color: "#3B82F6",
    description: "Gestió de patrocinis",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-equips-club",
    workspaceId: "dep-esportiu",
    name: "E-Equips Club",
    color: "#3B82F6",
    description: "Gestió dels equips del club",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-tornejos",
    workspaceId: "dep-esportiu",
    name: "E-Tornejos",
    color: "#3B82F6",
    description: "Organització de tornejos",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-acords-camp",
    workspaceId: "dep-esportiu",
    name: "E-Acords Camp",
    color: "#3B82F6",
    description: "Acords amb altres camps",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-e-socis-abonos",
    workspaceId: "dep-esportiu",
    name: "E-Socis-Abonos",
    color: "#3B82F6",
    description: "Manteniment de socis i abonaments",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c-reserves",
    workspaceId: "dep-comercial",
    name: "C-Reserves",
    color: "#10B981",
    description: "Gestió de reserves",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c-golf-societies",
    workspaceId: "dep-comercial",
    name: "C-Golf Societies",
    color: "#10B981",
    description: "Gestió de grups i revistes de golf",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c-pros",
    workspaceId: "dep-comercial",
    name: "C-Pro's",
    color: "#10B981",
    description: "Gestió de professionals",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c-ttoo",
    workspaceId: "dep-comercial",
    name: "C-TTOO",
    color: "#10B981",
    description: "Gestió de Tour Operadors",
    status: "active",
    createdAt: new Date().toISOString()
  },
  {
    id: "proj-c-hotels",
    workspaceId: "dep-comercial",
    name: "C-Hotels",
    color: "#10B981",
    description: "Gestió de convenis d'hotels",
    status: "active",
    createdAt: new Date().toISOString()
  }
];

export const STARTER_TASKS: Task[] = [
  {
    id: "task-1",
    projectId: "proj-torneig-primavera",
    workspaceId: "dep-esportiu",
    title: "Tancar calendari de Tee Times amb Camiral",
    description: "Gestionar els dies exactes en cap de setmana amb tarifes de temporada alta, inclosos buggies de cortesia.",
    assigneeId: "member_ester",
    assigneeIds: ["member_ester"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu", "dep-pitch-putt"],
    status: "in_progress",
    priority: "high",
    dueDate: "2026-06-25"
  },
  {
    id: "task-2",
    projectId: "proj-social-media",
    workspaceId: "dep-marqueting",
    title: "Dissenyar cartàleg de premis i patrocinadors",
    description: "Llistat de trofeus i col·laboradors com marques esportives premium de roba i pals de golf.",
    assigneeId: "member_erika",
    assigneeIds: ["member_erika"],
    departmentId: "dep-marqueting",
    departmentIds: ["dep-marqueting", "dep-comercial"],
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-02"
  },
  {
    id: "task-3",
    projectId: "proj-manteniment-green",
    workspaceId: "dep-comercial",
    title: "Contractar subministrament de fertilitzant orgànic",
    description: "Assegurar la correcta quantitat per als greens de practiques abans dels mesos d'estiu més càlids.",
    assigneeId: "member_marina",
    assigneeIds: ["member_marina"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "review",
    priority: "high",
    dueDate: "2026-06-05"
  },
  {
    id: "task-4",
    projectId: "proj-botiga-estoc",
    workspaceId: "dep-comercial",
    title: "Definir pressupost de campanyes a Meta i Google Ads",
    description: "Segmentar el público objectiu resident a Barcelona, Andorra i sud de França interessat en golf d'alta gama.",
    assigneeId: "member_marc",
    assigneeIds: ["member_marc"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial", "dep-marqueting"],
    status: "todo",
    priority: "high",
    dueDate: "2026-06-08"
  },
  {
    id: "task-5",
    projectId: "proj-social-media",
    workspaceId: "dep-marqueting",
    title: "Sessió de fotos aèria amb drons per a landing page",
    description: "Material visual per a la nova pàgina d'aterratge de l'associació de clubs de golf.",
    assigneeId: "member_erika",
    assigneeIds: ["member_erika"],
    departmentId: "dep-marqueting",
    departmentIds: ["dep-marqueting", "dep-esportiu"],
    status: "done",
    priority: "medium",
    dueDate: "2026-06-05"
  },
  {
    id: "task-6",
    projectId: "proj-lliga-pitch-putt",
    workspaceId: "dep-pitch-putt",
    title: "Preparar bases de la Lliga Local Pitch & Putt",
    description: "Revisar reglaments del recorregut reduït, categories de handicap, premis i coordinació amb el comitè de competició.",
    assigneeId: "member_ester",
    assigneeIds: ["member_ester"],
    departmentId: "dep-pitch-putt",
    departmentIds: ["dep-pitch-putt", "dep-esportiu"],
    status: "todo",
    priority: "high",
    dueDate: "2026-06-11"
  },
  {
    id: "task-7",
    projectId: "proj-botiga-estoc",
    workspaceId: "dep-comercial",
    title: "Inventari de roba tècnica i calçat FootJoy",
    description: "Recomptar unitats restants del magatzem, aplicar descomptes outlet de fins al 45% i activar nova cartelleria.",
    assigneeId: "member_marc",
    assigneeIds: ["member_marc"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-06-18"
  },
  {
    id: "task-8",
    projectId: "proj-e-proshop",
    workspaceId: "dep-esportiu",
    title: "Coordinar nova comanda de boles i accessoris Titleist",
    description: "Planificar stock mínim de seguretat de boles ProV1 i organitzar el marxandatge personalitzat amb el logo del club.",
    assigneeId: "member_ester",
    assigneeIds: ["member_ester"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu"],
    status: "todo",
    priority: "low",
    dueDate: "2026-06-15"
  },
  {
    id: "task-9",
    projectId: "proj-e-patrociinis",
    workspaceId: "dep-esportiu",
    title: "Reunió de renovació anual amb Estrella Damm",
    description: "Revisar clàusules de preferència de begudes, espais publicitaris restants, carpes d'entrega de targes i pack de benvinguda.",
    assigneeId: "member_erika",
    assigneeIds: ["member_erika"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu", "dep-marqueting"],
    status: "in_progress",
    priority: "high",
    dueDate: "2026-06-21"
  },
  {
    id: "task-10",
    projectId: "proj-e-equips-club",
    workspaceId: "dep-esportiu",
    title: "Definir calendari d'entrenaments de l'equip infantil",
    description: "Organitzar hores en el camp de pràctiques i coordinar sortides al camp dels divendres a la tarda amb l'escola de golf.",
    assigneeId: "member_ester",
    assigneeIds: ["member_ester"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu"],
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-20"
  },
  {
    id: "task-11",
    projectId: "proj-e-tornejos",
    workspaceId: "dep-esportiu",
    title: "Enviar invitacions i cartells del Torneig de Reis",
    description: "Distribució del fitxer PDF, formulari d'inscripció online per a socis i reserva de catering d'entrega de premis.",
    assigneeId: "member_erika",
    assigneeIds: ["member_erika"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu"],
    status: "done",
    priority: "medium",
    dueDate: "2026-06-03"
  },
  {
    id: "task-12",
    projectId: "proj-e-acords-camp",
    workspaceId: "dep-esportiu",
    title: "Revisió de conveni de correspondència amb Real Club de El Prat",
    description: "Verificar limitacions de joc de cap de setmana per a socis recíprocs i actualitzar preu especial de green fee concertat.",
    assigneeId: "member_marina",
    assigneeIds: ["member_marina"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu"],
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-22"
  },
  {
    id: "task-13",
    projectId: "proj-e-socis-abonos",
    workspaceId: "dep-esportiu",
    title: "Actualitzar base de dades amb les noves altes de juny",
    description: "Alta en el programa intern, lliurament de targetes físiques d'accés, marcadors de handicap i benvinguda oficial.",
    assigneeId: "member_marina",
    assigneeIds: ["member_marina"],
    departmentId: "dep-esportiu",
    departmentIds: ["dep-esportiu"],
    status: "done",
    priority: "low",
    dueDate: "2026-06-04"
  },
  {
    id: "task-14",
    projectId: "proj-c-reserves",
    workspaceId: "dep-comercial",
    title: "Sincronització de tarifes turoperadors en la plataforma",
    description: "Actualització de contingut de turoperadors anglesos i alemanys amb enllaç XML directe per evitar overbooking.",
    assigneeId: "member_marc",
    assigneeIds: ["member_marc"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "in_progress",
    priority: "high",
    dueDate: "2026-06-14"
  },
  {
    id: "task-15",
    projectId: "proj-c-golf-societies",
    workspaceId: "dep-comercial",
    title: "Enviar dossier de tarifes de grups a societats estrangeres",
    description: "Enviar la proposta comercial a grups històrics del Regne Unit, Suècia i Noruega amb tarifes consolidades de mitja pensió.",
    assigneeId: "member_marina",
    assigneeIds: ["member_marina"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-16"
  },
  {
    id: "task-16",
    projectId: "proj-c-pros",
    workspaceId: "dep-comercial",
    title: "Coordinar horaris de classes i tee times dels professionals",
    description: "Establir el guió d'activitats de les escoles de golf associades i assignar monitors en dies festius concurreguts.",
    assigneeId: "member_marc",
    assigneeIds: ["member_marc"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "todo",
    priority: "low",
    dueDate: "2026-06-19"
  },
  {
    id: "task-17",
    projectId: "proj-c-ttoo",
    workspaceId: "dep-comercial",
    title: "Negociació de comissions per a la temporada de tardor 2026",
    description: "Revisar ràtio de bonificació dels operadors principals de la Costa Brava per a reserves de grup superiors a 12 de handicap.",
    assigneeId: "member_marina",
    assigneeIds: ["member_marina"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial"],
    status: "review",
    priority: "high",
    dueDate: "2026-06-13"
  },
  {
    id: "task-18",
    projectId: "proj-c-hotels",
    workspaceId: "dep-comercial",
    title: "Signatura de convenis amb els hotels de referència",
    description: "Acords amb allotjaments 4 i 5 estrelles propers oferint paquets Golf & Hotel integrats amb reserva simplificada.",
    assigneeId: "member_erika",
    assigneeIds: ["member_erika"],
    departmentId: "dep-comercial",
    departmentIds: ["dep-comercial", "dep-marqueting"],
    status: "todo",
    priority: "medium",
    dueDate: "2026-06-24"
  }
];

/**
 * Neteja i parseja qualsevol preu extret en format text per convertir-lo en un número net.
 * Elimina símbols de divisa "€", "EUR", espais en blanc, i canvia les comes per punts decimals.
 */
export function parseAndCleanPrice(priceInput: string | number): number {
  if (typeof priceInput === "number") {
    return isNaN(priceInput) ? 0 : Number(priceInput.toFixed(2));
  }
  if (!priceInput) return 0;
  
  const sanitized = priceInput
    .toString()
    .replace(/[€$£]/g, "")
    .replace(/EUR/gi, "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .trim();

  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Filtres estrictes de productes i tarifes per a cada camp de golf.
 */
export const COURSE_TARIFF_FILTERS = {
  pals: ["PALS - 18 HOYOS ADULTO", "18 HOYOS TWILIGHT"],
  emporda: ["GF 18 HOLES FOREST", "GF ALL YOU CAN PLAY FOREST"],
  costa_brava: ["18 holes", "18 holes Sun Hour"],
  camiral: ["Stadium Course"],
  perelada: ["GREEN FEE 18 Hoyos"],
  torremirona: [
    "GF 18 - Earlybird",
    "GF 18 Forats",
    "GF 18 - 4 Jugadors",
    "GF 18 - Summer Fee",
    "GF 18 - Twilight",
    "GF 18 - All You Can Play"
  ]
};

/**
 * Comprova si una tarifa és permesa segons els criteris estrictes requerits pel client.
 */
export function isAllowedTariff(courseName: string, tariffName: string): boolean {
  const normCourse = courseName.toLowerCase();
  const normTariff = tariffName.trim();

  if (normCourse.includes("pals")) {
    return COURSE_TARIFF_FILTERS.pals.includes(normTariff);
  }
  if (normCourse.includes("empord")) {
    return COURSE_TARIFF_FILTERS.emporda.includes(normTariff);
  }
  if (normCourse.includes("costa brava")) {
    return COURSE_TARIFF_FILTERS.costa_brava.includes(normTariff);
  }
  if (normCourse.includes("camiral") || normCourse.includes("stadium")) {
    return COURSE_TARIFF_FILTERS.camiral.includes(normTariff);
  }
  if (normCourse.includes("perelada") || normCourse.includes("peralada")) {
    return COURSE_TARIFF_FILTERS.perelada.includes(normTariff);
  }
  if (normCourse.includes("torremirona")) {
    return COURSE_TARIFF_FILTERS.torremirona.includes(normTariff);
  }
  
  if (normCourse.includes("aro") || normCourse.includes("mas nou")) {
    return true;
  }

  return false;
}

export function getRealWorldCompetitorPrices(courseName: string, isWeekend: boolean) {
  const normalized = courseName.toLowerCase().trim();

  if (normalized.includes("camiral") || normalized.includes("pga")) {
    return {
      greenFeeHigh: isWeekend ? 215 : 195,
      greenFeeLow: isWeekend ? 139 : 125,
      buggyRental: 55,
      clubRental: 65,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 191.5 : 170,
        "08:00-12:00": isWeekend ? 215 : 195,
        "12:00-13:00": isWeekend ? 215 : 195,
        "13:00-14:00": isWeekend ? 215 : 195,
        "14:00-15:00": isWeekend ? 215 : 195,
        "15:00-16:00": isWeekend ? 191.5 : 170,
        "16:00-21:00": isWeekend ? 139 : 125
      },
      hourlyTariffs: {
        "07:00-08:00": "Stadium Course",
        "08:00-12:00": "Stadium Course",
        "12:00-13:00": "Stadium Course",
        "13:00-14:00": "Stadium Course",
        "14:00-15:00": "Stadium Course",
        "15:00-16:00": "Stadium Course",
        "16:00-21:00": "Stadium Course"
      }
    };
  }

  if (normalized.includes("pals")) {
    return {
      greenFeeHigh: isWeekend ? 125 : 115,
      greenFeeLow: isWeekend ? 80 : 75,
      buggyRental: 48,
      clubRental: 45,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 100 : 90,
        "08:00-12:00": isWeekend ? 125 : 115,
        "12:00-13:00": isWeekend ? 115 : 105,
        "13:00-14:00": isWeekend ? 105 : 95,
        "14:00-15:00": isWeekend ? 95 : 85,
        "15:00-16:00": isWeekend ? 90 : 80,
        "16:00-21:00": isWeekend ? 80 : 75
      },
      hourlyTariffs: {
        "07:00-08:00": "PALS - 18 HOYOS ADULTO",
        "08:00-12:00": "PALS - 18 HOYOS ADULTO",
        "12:00-13:00": "PALS - 18 HOYOS ADULTO",
        "13:00-14:00": "PALS - 18 HOYOS ADULTO",
        "14:00-15:00": "PALS - 18 HOYOS ADULTO",
        "15:00-16:00": "18 HOYOS TWILIGHT",
        "16:00-21:00": "18 HOYOS TWILIGHT"
      }
    };
  }

  if (normalized.includes("empord") || normalized.includes("gualta")) {
    return {
      greenFeeHigh: isWeekend ? 110 : 100,
      greenFeeLow: isWeekend ? 70 : 65,
      buggyRental: 45,
      clubRental: 40,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 90 : 80,
        "08:00-12:00": isWeekend ? 110 : 100,
        "12:00-13:00": isWeekend ? 100 : 90,
        "13:00-14:00": isWeekend ? 95 : 85,
        "14:00-15:00": isWeekend ? 88 : 80,
        "15:00-16:00": isWeekend ? 82 : 75,
        "16:00-21:00": isWeekend ? 70 : 65
      },
      hourlyTariffs: {
        "07:00-08:00": "GF 18 HOLES FOREST",
        "08:00-12:00": "GF 18 HOLES FOREST",
        "12:00-13:00": "GF 18 HOLES FOREST",
        "13:00-14:00": "GF 18 HOLES FOREST",
        "14:00-15:00": "GF ALL YOU CAN PLAY FOREST",
        "15:00-16:00": "GF ALL YOU CAN PLAY FOREST",
        "16:00-21:00": "GF ALL YOU CAN PLAY FOREST"
      }
    };
  }

  if (normalized.includes("costa brava")) {
    return {
      greenFeeHigh: isWeekend ? 105 : 95,
      greenFeeLow: isWeekend ? 70 : 65,
      buggyRental: 42,
      clubRental: 40,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 85 : 75,
        "08:00-12:00": isWeekend ? 105 : 95,
        "12:00-13:00": isWeekend ? 98 : 88,
        "13:00-14:00": isWeekend ? 92 : 82,
        "14:00-15:00": isWeekend ? 85 : 75,
        "15:00-16:00": isWeekend ? 80 : 70,
        "16:00-21:00": isWeekend ? 70 : 65
      },
      hourlyTariffs: {
        "07:00-08:00": "18 holes",
        "08:00-12:00": "18 holes",
        "12:00-13:00": "18 holes",
        "13:00-14:00": "18 holes",
        "14:00-15:00": "18 holes",
        "15:00-16:00": "18 holes Sun Hour",
        "16:00-21:00": "18 holes Sun Hour"
      }
    };
  }

  if (normalized.includes("torremirona")) {
    return {
      greenFeeHigh: isWeekend ? 107 : 97,
      greenFeeLow: isWeekend ? 82 : 75,
      buggyRental: 42,
      clubRental: 38,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 83 : 75,
        "08:00-12:00": isWeekend ? 107 : 97,
        "12:00-13:00": isWeekend ? 81 : 75,
        "13:00-14:00": isWeekend ? 81 : 75,
        "14:00-15:00": isWeekend ? 75 : 69,
        "15:00-16:00": isWeekend ? 75 : 69,
        "16:00-21:00": isWeekend ? 52 : 48
      },
      hourlyTariffs: {
        "07:00-08:00": "GF 18 - Earlybird",
        "08:00-12:00": "GF 18 Forats",
        "12:00-13:00": "GF 18 - Summer Fee",
        "13:00-14:00": "GF 18 - Summer Fee",
        "14:00-15:00": "GF 18 - Twilight",
        "15:00-16:00": "GF 18 - Twilight",
        "16:00-21:00": "GF 18 - All You Can Play"
      }
    };
  }

  if (normalized.includes("perelada")) {
    return {
      greenFeeHigh: isWeekend ? 120 : 110,
      greenFeeLow: isWeekend ? 80 : 75,
      buggyRental: 45,
      clubRental: 40,
      hourlyRates: {
        "07:00-08:00": isWeekend ? 95 : 85,
        "08:00-12:00": isWeekend ? 120 : 110,
        "12:00-13:00": isWeekend ? 105 : 95,
        "13:00-14:00": isWeekend ? 98 : 88,
        "14:00-15:00": isWeekend ? 90 : 80,
        "15:00-16:00": isWeekend ? 85 : 75,
        "16:00-21:00": isWeekend ? 80 : 75
      },
      hourlyTariffs: {
        "07:00-08:00": "GREEN FEE 18 Hoyos",
        "08:00-12:00": "GREEN FEE 18 Hoyos",
        "12:00-13:00": "GREEN FEE 18 Hoyos",
        "13:00-14:00": "GREEN FEE 18 Hoyos",
        "14:00-15:00": "GREEN FEE 18 Hoyos",
        "15:00-16:00": "GREEN FEE 18 Hoyos",
        "16:00-21:00": "GREEN FEE 18 Hoyos"
      }
    };
  }

  return null;
}
