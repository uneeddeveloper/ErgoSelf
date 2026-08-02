/** POST /api/auth/keluar — mengakhiri sesi responden maupun admin. */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { sukses: true }
})
