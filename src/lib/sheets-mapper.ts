export const INSTALLATION_SNAKE_MAP: Record<string, string> = {
  id: 'id', no: 'no', dateinstalled: 'dateInstalled', agentname: 'agentName',
  jonumber: 'joNumber', accountnumber: 'accountNumber', subsname: 'subscriberName',
  contact1: 'contactNumber1', contact2: 'contactNumber2', address: 'address',
  houselatitude: 'houseLatitude', houselongitude: 'houseLongitude', port: 'port',
  technician: 'assignedTechnician', modemserial: 'modemSerial',
  reelnum: 'reelNo', reelstart: 'reelStart', reelend: 'reelEnd',
  fiberopticcable: 'fiberOpticCable', mechconnector: 'mechanicalConnector',
  sclam: 'sClamp', patchcordapcsc: 'patchcordApsc', housebracket: 'houseBracket',
  midspan: 'midspan', cableclip: 'cableClip', ftthterminalbox: 'ftthTerminalBox',
  doublesidedtape: 'doubleSidedTape', cabletiewrap: 'cableTieWrap',
  status: 'status', monthinstalled: 'monthInstalled', yearinstalled: 'yearInstalled',
  loadexpire: 'loadExpire', notifstatus: 'notifyStatus', loadstatus: 'loadStatus',
  createdat: 'createdAt', updatedat: 'updatedAt',
};

export const ELOAD_SNAKE_MAP: Record<string, string> = {
  id: 'id', gcashhandler: 'gcashHandler', dateloaded: 'dateLoaded',
  gcashreference: 'gcashReference', timeloaded: 'timeLoaded', amount: 'amount',
  accountnumber: 'accountNumber', markup: 'markup', incentive: 'incentive',
  retailer: 'retailer', dealer: 'dealer', remarks: 'remarks',
  createdat: 'createdAt', updatedat: 'updatedAt',
};

export const USER_SNAKE_MAP: Record<string, string> = {
  id: 'id', username: 'username', password: 'password', role: 'role', createdat: 'createdAt', updatedat: 'updatedAt',
};

export const HISTORICAL_SNAKE_MAP: Record<string, string> = {
  id: 'id', dateinstalled: 'dateInstalled', jonumber: 'joNumber',
  accountnumber: 'accountNumber', subsname: 'subscriberName',
  address: 'address', contact1: 'contactNumber1', contact2: 'contactNumber2',
  technician: 'assignedTechnician', modemserial: 'modemSerial', port: 'port',
  napboxlonglat: 'napBoxLonglat',
  fiberopticcable: 'fiberOpticCable', mechconnector: 'mechanicalConnector',
  sclamp: 'sClamp', patchcordapsc: 'patchcordApsc', housebracket: 'houseBracket',
  midspan: 'midspan', cableclip: 'cableClip', ftthterminalbox: 'ftthTerminalBox',
  doublesidedtape: 'doubleSidedTape', cabletiewrap: 'cableTieWrap',
  gcashhandler: 'gcashHandler', gcashreference: 'gcashReference',
  timeloaded: 'timeLoaded', amount: 'amount', markup: 'markup',
  incentive: 'incentive', retailer: 'retailer', dealer: 'dealer',
  remarks: 'remarks', createdat: 'createdAt', updatedat: 'updatedAt',
};

export function getMappingForSheet(sheet: string): Record<string, string> {
  const normalized = sheet.toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'installations') return INSTALLATION_SNAKE_MAP;
  if (normalized === 'eload') return ELOAD_SNAKE_MAP;
  if (normalized === 'users') return USER_SNAKE_MAP;
  if (normalized === 'historicaldata') return HISTORICAL_SNAKE_MAP;
  return {};
}

export function mapSnakeToCamel(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [snake, val] of Object.entries(row)) {
    const camel = mapping[snake.toLowerCase()];
    if (camel) {
      result[camel] = val;
    } else {
      result[snake] = val;
    }
  }
  return result;
}

export function mapCamelToSnake(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const reverseMap: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(mapping)) {
    reverseMap[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const snake = reverseMap[key];
    result[snake || key] = val;
  }
  return result;
}
