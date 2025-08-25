import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'es' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation & Common
    'nav.dashboard': 'Dashboard',
    'nav.campaigns': 'Campaigns',
    'nav.flights': 'Flights',
    'nav.deals': 'Deals',
    'nav.pipeline': 'Pipeline',
    'nav.contacts': 'Contacts',
    'nav.advertisers': 'Advertisers',
    'nav.brands': 'Brands',
    'nav.spaces': 'Spaces',
    'nav.integrations': 'Integrations',
    'nav.reports': 'Reports',
    'nav.forecast': 'Forecast',
    'nav.userLogs': 'User Logs',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to your dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.recentActivity': 'Recent Activity',
    
    // Campaigns
    'campaigns.title': 'Campaigns',
    'campaigns.description': 'Manage your advertising campaigns',
    'campaigns.create': 'Create Campaign',
    'campaigns.totalCampaigns': 'Total Campaigns',
    'campaigns.activeCampaigns': 'Active Campaigns',
    'campaigns.totalSpend': 'Total Spend',
    'campaigns.totalImpressions': 'Total Impressions',
    'campaigns.search': 'Search campaigns...',
    'campaigns.noCampaigns': 'No campaigns found. Create your first campaign.',
    'campaigns.noFilteredCampaigns': 'No campaigns found with applied filters.',
    
    // Flights page
    'flights.title': 'Flights',
    'flights.description': 'Manage your advertising campaign flights',
    'flights.total': 'Total Flights',
    'flights.active': 'Active Flights',
    'flights.totalImpressions': 'Total Impressions',
    'flights.totalSpend': 'Total Spend',
    'flights.filters': 'Filters',
    'flights.search': 'Search flights or campaigns...',
    'flights.noFlights': 'No flights found. Create the first campaign with flights.',
    'flights.noFilteredFlights': 'No flights found with applied filters.',
    'flights.campaign': 'Campaign',
    'flights.campaignFlights': 'Campaign flights',
    'flights.priority': 'Priority',
    'flights.period': 'Period',
    'flights.budget': 'Budget',
    'flights.spend': 'Spend',
    'flights.impressions': 'Impressions',
    'flights.clicks': 'Clicks',
    'flights.conversions': 'Conversions',
    'flights.loading': 'Loading...',
    'flights.error': 'Error loading flights.',
    
    // Deals
    'deals.title': 'Deals',
    'deals.description': 'Manage your sales opportunities',
    'deals.create': 'Create Deal',
    'deals.totalDeals': 'Total Deals',
    'deals.activeDeals': 'Active Deals',
    'deals.totalValue': 'Total Value',
    'deals.search': 'Search deals...',
    
    // Contacts
    'contacts.title': 'Contacts',
    'contacts.description': 'Manage your contacts and relationships',
    'contacts.create': 'Add Contact',
    'contacts.totalContacts': 'Total Contacts',
    'contacts.search': 'Search contacts...',
    'contacts.firstName': 'First Name',
    'contacts.lastName': 'Last Name',
    'contacts.email': 'Email',
    'contacts.phone': 'Phone',
    'contacts.company': 'Company',
    'contacts.jobTitle': 'Job Title',
    
    // Advertisers
    'advertisers.title': 'Advertisers',
    'advertisers.description': 'Manage your advertiser accounts',
    'advertisers.create': 'Add Advertiser',
    'advertisers.totalAdvertisers': 'Total Advertisers',
    'advertisers.search': 'Search advertisers...',
    'advertisers.name': 'Name',
    
    // Brands
    'brands.title': 'Brands',
    'brands.brandDescription': 'Manage your brand portfolio',
    'brands.create': 'Add Brand',
    'brands.totalBrands': 'Total Brands',
    'brands.search': 'Search brands...',
    'brands.name': 'Name',
    'brands.website': 'Website',
    'brands.description': 'Description',
    
    // Spaces
    'spaces.title': 'Ad Spaces',
    'spaces.description': 'Manage your advertising spaces and inventory',
    'spaces.create': 'Add Space',
    'spaces.totalSpaces': 'Total Spaces',
    'spaces.activeSpaces': 'Active Spaces',
    'spaces.search': 'Search spaces...',
    
    // Reports
    'reports.title': 'Reports',
    'reports.description': 'View analytics and performance reports',
    'reports.performance': 'Performance Reports',
    'reports.analytics': 'Analytics',
    
    // Integrations
    'integrations.title': 'Integrations',
    'integrations.description': 'Manage your third-party integrations',
    'integrations.connect': 'Connect Integration',
    'integrations.active': 'Active Integrations',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.personalSettings': 'Personal Settings',
    'settings.businessSettings': 'Business Settings',
    
    // Languages
    'language.en': 'English',
    'language.fr': 'Français',
    'language.es': 'Español',
    'language.pt': 'Português',
    
    // Status
    'status.active': 'Active',
    'status.paused': 'Paused',
    'status.draft': 'Draft',
    'status.completed': 'Completed',
    'status.inactive': 'Inactive',
    
    // Common
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.name': 'Name',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.actions': 'Actions',
    'common.noData': 'No data available',
    
    // User Logs
    'userLogs.title': 'User Activity Logs',
    'userLogs.subtitle': 'Activity history for {name}',
    'userLogs.loadError': 'Error loading user logs.',
    'userLogs.loadingLogs': 'Loading logs...',
    'userLogs.accessDenied': 'Only administrators can access user activity logs.',
    'userLogs.backToSettings': 'Back to Settings',
    'userLogs.userInfo': 'User Information',
    'userLogs.name': 'Name',
    'userLogs.email': 'Email',
    'userLogs.role': 'Role',
    'userLogs.filters': 'Filters',
    'userLogs.searchPlaceholder': 'Search in actions or details...',
    'userLogs.allActions': 'All actions',
    'userLogs.allPeriods': 'All periods',
    'userLogs.today': 'Today',
    'userLogs.lastWeek': 'Last week',
    'userLogs.lastMonth': 'Last month',
    'userLogs.activityHistory': 'Activity History',
    'userLogs.records': 'records',
    'userLogs.noLogs': 'No activity logs exist for this user.',
    'userLogs.noMatchingLogs': 'No logs found matching the applied filters.',
    'userLogs.details': 'Details',
    'userLogs.type': 'Type',
    'userLogs.defaultUser': 'User',
  },
  fr: {
    // Navigation & Common
    'nav.dashboard': 'Tableau de Bord',
    'nav.campaigns': 'Campagnes',
    'nav.flights': 'Vols',
    'nav.deals': 'Affaires',
    'nav.pipeline': 'Pipeline',
    'nav.contacts': 'Contacts',
    'nav.advertisers': 'Annonceurs',
    'nav.brands': 'Marques',
    'nav.spaces': 'Espaces',
    'nav.integrations': 'Intégrations',
    'nav.reports': 'Rapports',
    'nav.forecast': 'Prévisions',
    'nav.userLogs': 'Journaux',
    'nav.settings': 'Paramètres',
    
    // Dashboard
    'dashboard.title': 'Tableau de Bord',
    'dashboard.welcome': 'Bienvenue sur votre tableau de bord',
    'dashboard.overview': 'Aperçu',
    'dashboard.recentActivity': 'Activité Récente',
    
    // Campaigns
    'campaigns.title': 'Campagnes',
    'campaigns.description': 'Gérez vos campagnes publicitaires',
    'campaigns.create': 'Créer une Campagne',
    'campaigns.totalCampaigns': 'Total des Campagnes',
    'campaigns.activeCampaigns': 'Campagnes Actives',
    'campaigns.totalSpend': 'Dépense Totale',
    'campaigns.totalImpressions': 'Total des Impressions',
    'campaigns.search': 'Rechercher des campagnes...',
    'campaigns.noCampaigns': 'Aucune campagne trouvée. Créez votre première campagne.',
    'campaigns.noFilteredCampaigns': 'Aucune campagne trouvée avec les filtres appliqués.',
    
    // Flights page
    'flights.title': 'Vols',
    'flights.description': 'Gérez les vols de vos campagnes publicitaires',
    'flights.total': 'Total des Vols',
    'flights.active': 'Vols Actifs',
    'flights.totalImpressions': 'Total des Impressions',
    'flights.totalSpend': 'Dépense Totale',
    'flights.filters': 'Filtres',
    'flights.search': 'Rechercher des vols ou des campagnes...',
    'flights.noFlights': 'Aucun vol trouvé. Créez la première campagne avec des vols.',
    'flights.noFilteredFlights': 'Aucun vol trouvé avec les filtres appliqués.',
    'flights.campaign': 'Campagne',
    'flights.campaignFlights': 'Vols de campagne',
    'flights.priority': 'Priorité',
    'flights.period': 'Période',
    'flights.budget': 'Budget',
    'flights.spend': 'Dépense',
    'flights.impressions': 'Impressions',
    'flights.clicks': 'Clics',
    'flights.conversions': 'Conversions',
    'flights.loading': 'Chargement...',
    'flights.error': 'Erreur lors du chargement des vols.',
    
    // Other sections with French translations...
    'deals.title': 'Affaires',
    'deals.description': 'Gérez vos opportunités de vente',
    'contacts.title': 'Contacts',
    'contacts.description': 'Gérez vos contacts et relations',
    'advertisers.title': 'Annonceurs',
    'advertisers.description': 'Gérez vos comptes annonceurs',
    'brands.title': 'Marques',
    'brands.brandDescription': 'Gérez votre portefeuille de marques',
    'spaces.title': 'Espaces Publicitaires',
    'spaces.description': 'Gérez vos espaces publicitaires et inventaire',
    'reports.title': 'Rapports',
    'reports.description': 'Consultez les analyses et rapports de performance',
    'integrations.title': 'Intégrations',
    'integrations.description': 'Gérez vos intégrations tierces',
    
    // Settings
    'settings.language': 'Langue',
    'settings.personalSettings': 'Paramètres Personnels',
    'settings.businessSettings': 'Paramètres Entreprise',
    
    // Languages
    'language.en': 'English',
    'language.fr': 'Français',
    'language.es': 'Español',
    'language.pt': 'Português',
    
    // Status
    'status.active': 'Actif',
    'status.paused': 'En Pause',
    'status.draft': 'Brouillon',
    'status.completed': 'Terminé',
    'status.inactive': 'Inactif',
    
    // Common
    'common.error': 'Erreur',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.name': 'Nom',
    'common.status': 'Statut',
    'common.date': 'Date',
    'common.actions': 'Actions',
    'common.noData': 'Aucune donnée disponible',
    
    // User Logs
    'userLogs.title': 'Journaux d\'Activité Utilisateur',
    'userLogs.subtitle': 'Historique d\'activité pour {name}',
    'userLogs.loadError': 'Erreur lors du chargement des journaux utilisateur.',
    'userLogs.loadingLogs': 'Chargement des journaux...',
    'userLogs.accessDenied': 'Seuls les administrateurs peuvent accéder aux journaux d\'activité des utilisateurs.',
    'userLogs.backToSettings': 'Retour aux Paramètres',
    'userLogs.userInfo': 'Informations Utilisateur',
    'userLogs.name': 'Nom',
    'userLogs.email': 'Email',
    'userLogs.role': 'Rôle',
    'userLogs.filters': 'Filtres',
    'userLogs.searchPlaceholder': 'Rechercher dans les actions ou détails...',
    'userLogs.allActions': 'Toutes les actions',
    'userLogs.allPeriods': 'Toutes les périodes',
    'userLogs.today': 'Aujourd\'hui',
    'userLogs.lastWeek': 'Semaine dernière',
    'userLogs.lastMonth': 'Mois dernier',
    'userLogs.activityHistory': 'Historique d\'Activité',
    'userLogs.records': 'enregistrements',
    'userLogs.noLogs': 'Aucun journal d\'activité n\'existe pour cet utilisateur.',
    'userLogs.noMatchingLogs': 'Aucun journal trouvé correspondant aux filtres appliqués.',
    'userLogs.details': 'Détails',
    'userLogs.type': 'Type',
    'userLogs.defaultUser': 'Utilisateur',
  },
  es: {
    // Navigation & Common
    'nav.dashboard': 'Panel de Control',
    'nav.campaigns': 'Campañas',
    'nav.flights': 'Vuelos',
    'nav.deals': 'Ofertas',
    'nav.pipeline': 'Pipeline',
    'nav.contacts': 'Contactos',
    'nav.advertisers': 'Anunciantes',
    'nav.brands': 'Marcas',
    'nav.spaces': 'Espacios',
    'nav.integrations': 'Integraciones',
    'nav.reports': 'Informes',
    'nav.forecast': 'Pronóstico',
    'nav.userLogs': 'Registros',
    'nav.settings': 'Configuración',
    
    // Dashboard
    'dashboard.title': 'Panel de Control',
    'dashboard.welcome': 'Bienvenido a tu panel de control',
    'dashboard.overview': 'Resumen',
    'dashboard.recentActivity': 'Actividad Reciente',
    
    // Campaigns
    'campaigns.title': 'Campañas',
    'campaigns.description': 'Gestiona tus campañas publicitarias',
    'campaigns.create': 'Crear Campaña',
    'campaigns.totalCampaigns': 'Total de Campañas',
    'campaigns.activeCampaigns': 'Campañas Activas',
    'campaigns.totalSpend': 'Gasto Total',
    'campaigns.totalImpressions': 'Total de Impresiones',
    'campaigns.search': 'Buscar campañas...',
    'campaigns.noCampaigns': 'No se encontraron campañas. Crea tu primera campaña.',
    'campaigns.noFilteredCampaigns': 'No se encontraron campañas con los filtros aplicados.',
    
    // Flights page
    'flights.title': 'Vuelos',
    'flights.description': 'Gestiona los vuelos de tus campañas publicitarias',
    'flights.total': 'Total de Vuelos',
    'flights.active': 'Vuelos Activos',
    'flights.totalImpressions': 'Total de Impresiones',
    'flights.totalSpend': 'Gasto Total',
    'flights.filters': 'Filtros',
    'flights.search': 'Buscar vuelos o campañas...',
    'flights.noFlights': 'No se encontraron vuelos. Crea la primera campaña con vuelos.',
    'flights.noFilteredFlights': 'No se encontraron vuelos con los filtros aplicados.',
    'flights.campaign': 'Campaña',
    'flights.campaignFlights': 'Vuelos de campaña',
    'flights.priority': 'Prioridad',
    'flights.period': 'Período',
    'flights.budget': 'Presupuesto',
    'flights.spend': 'Gasto',
    'flights.impressions': 'Impresiones',
    'flights.clicks': 'Clics',
    'flights.conversions': 'Conversiones',
    'flights.loading': 'Cargando...',
    'flights.error': 'Error al cargar vuelos.',
    
    // Other sections with Spanish translations...
    'deals.title': 'Ofertas',
    'deals.description': 'Gestiona tus oportunidades de venta',
    'contacts.title': 'Contactos',
    'contacts.description': 'Gestiona tus contactos y relaciones',
    'advertisers.title': 'Anunciantes',
    'advertisers.description': 'Gestiona tus cuentas de anunciantes',
    'brands.title': 'Marcas',
    'brands.brandDescription': 'Gestiona tu portafolio de marcas',
    'spaces.title': 'Espacios Publicitarios',
    'spaces.description': 'Gestiona tus espacios publicitarios e inventario',
    'reports.title': 'Informes',
    'reports.description': 'Ver análisis e informes de rendimiento',
    'integrations.title': 'Integraciones',
    'integrations.description': 'Gestiona tus integraciones de terceros',
    
    // Settings
    'settings.language': 'Idioma',
    'settings.personalSettings': 'Configuración Personal',
    'settings.businessSettings': 'Configuración Empresarial',
    
    // Languages
    'language.en': 'English',
    'language.fr': 'Français',
    'language.es': 'Español',
    'language.pt': 'Português',
    
    // Status
    'status.active': 'Activo',
    'status.paused': 'Pausado',
    'status.draft': 'Borrador',
    'status.completed': 'Completado',
    'status.inactive': 'Inactivo',
    
    // Common
    'common.error': 'Error',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.add': 'Agregar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.name': 'Nombre',
    'common.status': 'Estado',
    'common.date': 'Fecha',
    'common.actions': 'Acciones',
    'common.noData': 'No hay datos disponibles',
    
    // User Logs
    'userLogs.title': 'Registros de Actividad del Usuario',
    'userLogs.subtitle': 'Historial de actividad para {name}',
    'userLogs.loadError': 'Error al cargar los registros del usuario.',
    'userLogs.loadingLogs': 'Cargando registros...',
    'userLogs.accessDenied': 'Solo los administradores pueden acceder a los registros de actividad de los usuarios.',
    'userLogs.backToSettings': 'Volver a Configuración',
    'userLogs.userInfo': 'Información del Usuario',
    'userLogs.name': 'Nombre',
    'userLogs.email': 'Email',
    'userLogs.role': 'Rol',
    'userLogs.filters': 'Filtros',
    'userLogs.searchPlaceholder': 'Buscar en acciones o detalles...',
    'userLogs.allActions': 'Todas las acciones',
    'userLogs.allPeriods': 'Todos los períodos',
    'userLogs.today': 'Hoy',
    'userLogs.lastWeek': 'Última semana',
    'userLogs.lastMonth': 'Último mes',
    'userLogs.activityHistory': 'Historial de Actividad',
    'userLogs.records': 'registros',
    'userLogs.noLogs': 'No existen registros de actividad para este usuario.',
    'userLogs.noMatchingLogs': 'No se encontraron registros que coincidan con los filtros aplicados.',
    'userLogs.details': 'Detalles',
    'userLogs.type': 'Tipo',
    'userLogs.defaultUser': 'Usuario',
  },
  pt: {
    // Navigation & Common
    'nav.dashboard': 'Painel',
    'nav.campaigns': 'Campanhas',
    'nav.flights': 'Voos',
    'nav.deals': 'Negócios',
    'nav.pipeline': 'Pipeline',
    'nav.contacts': 'Contactos',
    'nav.advertisers': 'Anunciantes',
    'nav.brands': 'Marcas',
    'nav.spaces': 'Espaços',
    'nav.integrations': 'Integrações',
    'nav.reports': 'Relatórios',
    'nav.forecast': 'Previsão',
    'nav.userLogs': 'Registos',
    'nav.settings': 'Definições',
    
    // Dashboard
    'dashboard.title': 'Painel',
    'dashboard.welcome': 'Bem-vindo ao seu painel',
    'dashboard.overview': 'Visão Geral',
    'dashboard.recentActivity': 'Atividade Recente',
    
    // Campaigns
    'campaigns.title': 'Campanhas',
    'campaigns.description': 'Gerencie as suas campanhas publicitárias',
    'campaigns.create': 'Criar Campanha',
    'campaigns.totalCampaigns': 'Total de Campanhas',
    'campaigns.activeCampaigns': 'Campanhas Ativas',
    'campaigns.totalSpend': 'Gasto Total',
    'campaigns.totalImpressions': 'Total de Impressões',
    'campaigns.search': 'Pesquisar campanhas...',
    'campaigns.noCampaigns': 'Nenhuma campanha encontrada. Crie a sua primeira campanha.',
    'campaigns.noFilteredCampaigns': 'Nenhuma campanha encontrada com os filtros aplicados.',
    
    // Flights page
    'flights.title': 'Voos',
    'flights.description': 'Gerencie os voos das suas campanhas publicitárias',
    'flights.total': 'Total Voos',
    'flights.active': 'Voos Ativos',
    'flights.totalImpressions': 'Total Impressões',
    'flights.totalSpend': 'Total Gasto',
    'flights.filters': 'Filtros',
    'flights.search': 'Pesquisar voos ou campanhas...',
    'flights.noFlights': 'Nenhum voo encontrado. Crie a primeira campanha com voos.',
    'flights.noFilteredFlights': 'Nenhum voo encontrado com os filtros aplicados.',
    'flights.campaign': 'Campanha',
    'flights.campaignFlights': 'Voos da campanha',
    'flights.priority': 'Prioridade',
    'flights.period': 'Período',
    'flights.budget': 'Orçamento',
    'flights.spend': 'Gasto',
    'flights.impressions': 'Impressões',
    'flights.clicks': 'Cliques',
    'flights.conversions': 'Conversões',
    'flights.loading': 'Carregando...',
    'flights.error': 'Erro ao carregar voos.',
    
    // Other sections with Portuguese translations...
    'deals.title': 'Negócios',
    'deals.description': 'Gerencie as suas oportunidades de venda',
    'contacts.title': 'Contactos',
    'contacts.description': 'Gerencie os seus contactos e relacionamentos',
    'advertisers.title': 'Anunciantes',
    'advertisers.description': 'Gerencie as suas contas de anunciantes',
    'brands.title': 'Marcas',
    'brands.brandDescription': 'Gerencie o seu portfólio de marcas',
    'spaces.title': 'Espaços Publicitários',
    'spaces.description': 'Gerencie os seus espaços publicitários e inventário',
    'reports.title': 'Relatórios',
    'reports.description': 'Visualize análises e relatórios de performance',
    'integrations.title': 'Integrações',
    'integrations.description': 'Gerencie as suas integrações de terceiros',
    
    // Settings
    'settings.language': 'Idioma',
    'settings.personalSettings': 'Configurações Pessoais',
    'settings.businessSettings': 'Configurações Empresariais',
    
    // Languages
    'language.en': 'English',
    'language.fr': 'Français',
    'language.es': 'Español',
    'language.pt': 'Português',
    
    // Status
    'status.active': 'Ativo',
    'status.paused': 'Pausado',
    'status.draft': 'Rascunho',
    'status.completed': 'Concluído',
    'status.inactive': 'Inativo',
    
    // Common
    'common.error': 'Erro',
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Criar',
    'common.add': 'Adicionar',
    'common.search': 'Pesquisar',
    'common.filter': 'Filtrar',
    'common.name': 'Nome',
    'common.status': 'Estado',
    'common.date': 'Data',
    'common.actions': 'Ações',
    'common.noData': 'Não há dados disponíveis',
    
    // User Logs
    'userLogs.title': 'Logs de Atividade',
    'userLogs.subtitle': 'Histórico de atividade de {name}',
    'userLogs.loadError': 'Erro ao carregar os logs do utilizador.',
    'userLogs.loadingLogs': 'Carregando logs...',
    'userLogs.accessDenied': 'Apenas administradores podem aceder aos logs de atividade dos utilizadores.',
    'userLogs.backToSettings': 'Voltar às Definições',
    'userLogs.userInfo': 'Informações do Utilizador',
    'userLogs.name': 'Nome',
    'userLogs.email': 'Email',
    'userLogs.role': 'Role',
    'userLogs.filters': 'Filtros',
    'userLogs.searchPlaceholder': 'Pesquisar nas ações ou detalhes...',
    'userLogs.allActions': 'Todas as ações',
    'userLogs.allPeriods': 'Todos os períodos',
    'userLogs.today': 'Hoje',
    'userLogs.lastWeek': 'Última semana',
    'userLogs.lastMonth': 'Último mês',
    'userLogs.activityHistory': 'Histórico de Atividade',
    'userLogs.records': 'registos',
    'userLogs.noLogs': 'Não existem logs de atividade para este utilizador.',
    'userLogs.noMatchingLogs': 'Não foram encontrados logs que correspondam aos filtros aplicados.',
    'userLogs.details': 'Detalhes',
    'userLogs.type': 'Tipo',
    'userLogs.defaultUser': 'Utilizador',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language;
    if (savedLanguage && ['en', 'fr', 'es', 'pt'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key as keyof typeof translations[Language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};