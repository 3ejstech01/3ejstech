// User Roles
export enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  E_LOAD = 'eload',
  VIEW_ONLY = 'view_only'
}

// User Type
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Installation Record from Database
export interface Installation {
  id: string;
  no: string;
  dateInstalled: string;
  agentName: string;
  joNumber: string;
  accountNumber: string;
  subscriberName: string;
  contactNumber1: string;
  contactNumber2: string;
  houseLatitude: string;
  houseLongitude: string;
  port: string;
  napBoxLonglat: string;
  assignedTechnician: string;
  modemSerial: string;
  reelNo: string;
  start: string;
  end: string;
  fiberOpticCable: string;
  mechanicalConnector: string;
  sClamp: string;
  patchcordApsc: string;
  houseBracket: string;
  midspan: string;
  cableClip: string;
  ftthTerminalBox: string;
  doubleSidedTape: string;
  cableTieWrap: string;
  monthInstalled: string;
  yearInstalled: string;
  loadExpire: string;
  subsName: string;
  status: 'pending' | 'completed';
  address?: string;
  package?: string;
  assignedTech?: string;
  createdAt?: string;
  updatedAt?: string;
  notifyStatus?: 'Not Yet Notified' | 'Notified' | 'Not Needed';
  loadStatus?: 'Not yet Loaded' | 'Account Loaded';
}

// Raw row format as stored in IndexedDB (camelCase keys)
export interface InstallationRow {
id: string;
no: string;
dateInstalled: string;
agentName: string;
joNumber: string;
accountNumber: string;
subscriberName: string;
contactNumber1: string;
contactNumber2: string;
address: string;
houseLonglat: string;
port: string;
napBoxLonglat: string;
assignedTechnician: string;
modemSerial: string;
reelNo: string;
startLocation: string;
endLocation: string;
fiberOpticCable: string;
mechanicalConnector: string;
sClamp: string;
patchcordApsc: string;
houseBracket: string;
midspan: string;
cableClip: string;
ftthTerminalBox: string;
doubleSidedTape: string;
cableTieWrap: string;
status: string;
monthInstalled: string;
yearInstalled: string;
loadExpire: string;
createdAt: string;
updatedAt: string;
notifyStatus: string;
loadStatus: string;
}

// E-Load Transaction
export interface ELoadTransaction {
  id?: string;
  gcashAcct?: string;
  dateLoaded?: string;
  gcashReference?: string;
  time?: string;
  amount?: number;
  accountNo?: string;
  technician?: string;
  remarks?: string;
  markedUp?: number;
  incentive?: number;
  retailer?: number;
  dealer?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Raw row format as stored in IndexedDB (camelCase keys)
export interface ELoadRow {
id: string;
gcashHandler: string;
dateLoaded: string;
gcashReference: string;
timeLoaded: string;
amount: number | string;
accountNumber: string;
markedUp?: number;
incentive?: number;
retailer?: number;
dealer?: number;
remarks?: string;
createdAt: string;
updatedAt: string;
}

// Historical Data Row
export interface HistoricalDataRow {
  id: string;
  dateInstalled: string;
  joNumber: string;
  accountNumber: string;
  subscriberName: string;
  address: string;
  contactNumber1: string;
  contactNumber2: string;
  // Network & Equipment fields
assignedTechnician?: string;
modemSerial?: string;
port?: string;
napBoxLonglat?: string;
  fiberOpticCable?: string;
  mechanicalConnector?: string;
  sClamp?: string;
  patchcordApsc?: string;
  houseBracket?: string;
  midspan?: string;
  cableClip?: string;
  ftthTerminalBox?: string;
  doubleSidedTape?: string;
  cableTieWrap?: string;
  // E-Load related fields
  gcashHandler?: string;
  gcashReference?: string;
  timeLoaded?: string;
  amount?: number;
  markup?: number;
  incentive?: number;
  retailer?: number;
  dealer?: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

// User row format from IndexedDB (camelCase keys)
export interface UserRow {
id: string;
username: string;
password: string;
role: string;
createdAt: string;
}

// Theme Config
export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'ocean-blue' | 'sky-blue' | 'royal-purple' | 'emerald-green' | 'rose-pink' | 'sunset-orange' | 'teal-cyan' | 'slate-gray' | 'indigo-blue' | 'amber-gold' | 'corporate-blue' | '3jes-brand' | 'neon-tech' | 'minimalist' | 'midnight-blue' | 'deep-purple' | 'dark-emerald' | 'dark-rose' | 'dark-orange' | 'dark-teal' | 'dark-slate' | 'dark-indigo' | 'dark-cyan' | 'dark-amber';

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Ubuntu', label: 'Ubuntu' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

export const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra Large' },
];

export interface ThemeConfig {
  mode: ThemeMode;
  color: ThemeColor;
  font?: string;
  fontSize?: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalActiveSubscribers: number;
  pendingInstallations: number;
  dailyELoadRevenue: number;
  monthlyRevenue: number;
}
