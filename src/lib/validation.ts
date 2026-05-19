import { z } from 'zod';

export const InstallationSchema = z.object({
  id: z.string().optional(),
  no: z.string().optional(),
  dateInstalled: z.string().optional(),
  dateinstalled: z.string().optional(),
  agentName: z.string().optional(),
  agentname: z.string().optional(),
  joNumber: z.string().optional(),
  jonumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountnumber: z.string().optional(),
  subscriberName: z.string().optional(),
  subsname: z.string().optional(),
  contactNumber1: z.string().optional(),
  contact1: z.string().optional(),
  contactNumber2: z.string().optional(),
  contact2: z.string().optional(),
  address: z.string().optional(),
  houseLatitude: z.string().optional(),
  houseLongitude: z.string().optional(),
  houseLat: z.string().optional(),
  houseLong: z.string().optional(),
  port: z.string().optional(),
  assignedTechnician: z.string().optional(),
  technician: z.string().optional(),
  assignedTechnicians: z.array(z.string()).optional(),
  modemSerial: z.string().optional(),
  modemserial: z.string().optional(),
  reelNo: z.string().optional(),
  reelnum: z.string().optional(),
  start: z.string().optional(),
  startLocation: z.string().optional(),
  reelStart: z.string().optional(),
  end: z.string().optional(),
  endLocation: z.string().optional(),
  reelEnd: z.string().optional(),
  fiberOpticCable: z.string().optional(),
  fiberopticcable: z.string().optional(),
  mechanicalConnector: z.string().optional(),
  mechconnector: z.string().optional(),
  sClamp: z.string().optional(),
  sclam: z.string().optional(),
  patchcordApsc: z.string().optional(),
  patchcordapcsc: z.string().optional(),
  houseBracket: z.string().optional(),
  housebracket: z.string().optional(),
  midspan: z.string().optional(),
  cableClip: z.string().optional(),
  cableclip: z.string().optional(),
  ftthTerminalBox: z.string().optional(),
  ftthterminalbox: z.string().optional(),
  doubleSidedTape: z.string().optional(),
  doublesidedtape: z.string().optional(),
  cableTieWrap: z.string().optional(),
  cabletiewrap: z.string().optional(),
  status: z.string().optional(),
  monthInstalled: z.string().optional(),
  monthinstalled: z.string().optional(),
  yearInstalled: z.string().optional(),
  yearinstalled: z.string().optional(),
  loadExpire: z.string().optional(),
  loadexpire: z.string().optional(),
  notifyStatus: z.string().optional(),
  notifstatus: z.string().optional(),
  loadStatus: z.string().optional(),
  loadstatus: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  napBoxLonglat: z.string().optional(),
  napLatitude: z.string().optional(),
  napLongitude: z.string().optional(),
});

export const ELoadTransactionSchema = z.object({
  id: z.string().optional(),
  gcashAcct: z.string().min(1, 'GCash handler is required'),
  dateLoaded: z.string().optional(),
  timeLoaded: z.string().optional(),
  time: z.string().optional(),
  gcashReference: z.string().optional(),
  amount: z.union([z.number().min(1), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v),
  accountNo: z.string().min(1, 'Account number is required'),
  remarks: z.string().optional(),
  markedUp: z.union([z.number(), z.string()]).optional().transform(v => typeof v === 'string' ? parseFloat(v) : v),
  incentive: z.union([z.number(), z.string()]).optional().transform(v => typeof v === 'string' ? parseFloat(v) : v),
  retailer: z.union([z.number(), z.string()]).optional().transform(v => typeof v === 'string' ? parseFloat(v) : v),
  dealer: z.union([z.number(), z.string()]).optional().transform(v => typeof v === 'string' ? parseFloat(v) : v),
});

export const UserSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'technician', 'eload', 'view_only']),
});

export type ValidatedInstallation = z.infer<typeof InstallationSchema>;
export type ValidatedELoadTransaction = z.infer<typeof ELoadTransactionSchema>;
export type ValidatedUser = z.infer<typeof UserSchema>;

export function validateInstallation(data: unknown): { success: true; data: ValidatedInstallation } | { success: false; error: string } {
  const result = InstallationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}

export function validateELoadTransaction(data: unknown): { success: true; data: ValidatedELoadTransaction } | { success: false; error: string } {
  const result = ELoadTransactionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}

export function validateUser(data: unknown): { success: true; data: ValidatedUser } | { success: false; error: string } {
  const result = UserSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map(e => e.message).join(', ') };
}