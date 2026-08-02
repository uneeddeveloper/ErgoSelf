/**
 * Middleware halaman dashboard peneliti — dipakai lewat
 * `definePageMeta({ middleware: 'admin' })`.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value || user.value?.tipe !== 'ADMIN') {
    return navigateTo(`/admin/masuk?lanjut=${encodeURIComponent(to.fullPath)}`)
  }
})
