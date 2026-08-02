/**
 * Middleware halaman responden — dipakai lewat
 * `definePageMeta({ middleware: 'responden' })`.
 *
 * Menjaga urutan alur: belum masuk → /masuk, profil belum lengkap →
 * /profil, dan admin yang tersasar → dashboard.
 */

/** Halaman yang boleh dibuka meski profil pekerja belum diisi. */
const BEBAS_PROFIL = new Set(['/profil', '/beranda'])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo(`/masuk?lanjut=${encodeURIComponent(to.fullPath)}`)
  }

  if (user.value?.tipe !== 'RESPONDEN') {
    return navigateTo('/admin')
  }

  if (!user.value.profilLengkap && !BEBAS_PROFIL.has(to.path)) {
    return navigateTo('/profil')
  }
})
