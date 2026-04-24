import { useEffect, useState } from 'react'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { AppBar, Toolbar, Typography, Box, Button, Avatar } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { LoginForm } from './components/LoginForm'
import { SubmitJobForm } from './components/SubmitJobForm'
import { OrderStatus } from './components/OrderStatus'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a1a2e' },
    secondary: { main: '#e94560' },
    background: { default: '#f5f5f7' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
})

export default function App() {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem('access_token')
  )
  const [username, setUsername] = useState<string | null>(
    () => sessionStorage.getItem('username')
  )
  const [jobId, setJobId] = useState<string | null>(null)

  // Listen for session expiry triggered by 401 responses
  useEffect(() => {
    const onExpired = () => {
      setToken(null)
      setUsername(null)
      setJobId(null)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const handleLogin = (t: string, u: string) => {
    setToken(t)
    setUsername(u)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('username')
    setToken(null)
    setUsername(null)
    setJobId(null)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LockOutlinedIcon sx={{ mr: 1.5, color: 'secondary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 1 }}>
            COVERT
          </Typography>
          {token && username && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'secondary.main', fontSize: 13 }}>
                {username[0].toUpperCase()}
              </Avatar>
              <Typography variant="body2" sx={{ color: 'grey.300' }}>
                {username}
              </Typography>
              <Button
                size="small"
                onClick={handleLogout}
                sx={{ color: 'grey.400', '&:hover': { color: 'white' } }}
              >
                Sign out
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: 'background.default', py: 6 }}>
        {!token ? (
          <LoginForm onLogin={handleLogin} />
        ) : jobId ? (
          <Box sx={{ maxWidth: 560, mx: 'auto', px: 2 }}>
            <OrderStatus jobId={jobId} />
            <Button
              variant="outlined"
              onClick={() => setJobId(null)}
              sx={{ mt: 3 }}
              fullWidth
            >
              Submit another job
            </Button>
          </Box>
        ) : (
          <SubmitJobForm onSubmitted={setJobId} />
        )}
      </Box>

      <Box
        component="footer"
        sx={{ py: 2, textAlign: 'center', bgcolor: 'primary.main' }}
      >
        <Typography variant="caption" sx={{ color: 'grey.500' }}>
          Covert Secure Print Services © 2026 — Demo Project
        </Typography>
      </Box>
    </ThemeProvider>
  )
}
