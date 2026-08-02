/** Satu opsi pada kelompok radio `UiPilihan`. */
export interface OpsiPilihan<V> {
  nilai: V
  label: string
  /** Keterangan pendek di bawah label, mis. contoh atau penjelasan skala */
  keterangan?: string
}

/** Opsi ya/tidak yang dipakai berulang di form profil. */
export const OPSI_YA_TIDAK: readonly OpsiPilihan<boolean>[] = [
  { nilai: true, label: 'Ya' },
  { nilai: false, label: 'Tidak' },
] as const
