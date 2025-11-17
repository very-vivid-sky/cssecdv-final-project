import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import App from './App.jsx'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/charts/styles.css'

createRoot(document.getElementById('root')).render(
    <MantineProvider>
        <Notifications autoClose={1500} />
        <ModalsProvider>
            <App />
        </ModalsProvider>
    </MantineProvider>,
)
