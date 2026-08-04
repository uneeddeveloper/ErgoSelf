import type { ComputedRef, InjectionKey } from 'vue'

/**
 * Kaitan aksesibilitas yang diturunkan `UiKolom` kepada kontrol di dalamnya.
 *
 * Dipakai `UiPilihan`: sebuah `role="radiogroup"` tidak bisa diberi nama oleh
 * `<label for>`, jadi ia harus menunjuk id label lewat `aria-labelledby`.
 * Disalurkan lewat provide/inject supaya seluruh pemanggil yang sudah ada
 * tidak perlu diubah.
 */
export interface KaitanLabelKolom {
  labelledby: string
  describedby?: string
}

export const KUNCI_LABEL_KOLOM = Symbol('label-kolom') as InjectionKey<
  ComputedRef<KaitanLabelKolom>
>

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
