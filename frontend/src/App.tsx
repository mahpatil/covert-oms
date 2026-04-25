import { useEffect, useState } from 'react'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { AppBar, Toolbar, Typography, Box, Button, Avatar } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { LoginForm } from './components/LoginForm'
import { SubmitJobForm } from './components/SubmitJobForm'
import { JobsList } from './components/JobsList'

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
  const [showForm, setShowForm] = useState(false)

  // Listen for session expiry triggered by 401 responses
  useEffect(() => {
    const onExpired = () => {
      setToken(null)
      setUsername(null)
      setShowForm(false)
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
    setShowForm(false)
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
        ) : showForm ? (
          <SubmitJobForm onSubmitted={() => setShowForm(false)} />
        ) : (
          <JobsList onNewJob={() => setShowForm(true)} />
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
