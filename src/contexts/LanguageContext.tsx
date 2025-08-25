import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'es' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
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
    
    // Settings
    'settings.language': 'Language',
    'settings.personalSettings': 'Personal Settings',
    
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
    
    // Common
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
  fr: {
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
    
    // Settings
    'settings.language': 'Langue',
    'settings.personalSettings': 'Paramètres Personnels',
    
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
    
    // Common
    'common.error': 'Erreur',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
  },
  es: {
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
    
    // Settings
    'settings.language': 'Idioma',
    'settings.personalSettings': 'Configuración Personal',
    
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
    
    // Common
    'common.error': 'Error',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
  },
  pt: {
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
    
    // Settings
    'settings.language': 'Idioma',
    'settings.personalSettings': 'Configurações Pessoais',
    
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
    
    // Common
    'common.error': 'Erro',
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
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