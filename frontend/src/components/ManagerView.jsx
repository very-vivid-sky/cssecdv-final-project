import { Form, Link, Outlet } from 'react-router-dom'
import { AppShell, Group, Text, NavLink, Button, Stack } from '@mantine/core'

function ManagerView() {

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm' }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Text fw={700} size="lg">Saffron</Text>
                    </Group>
                    <Form action="/logout" method="post">
                        <Button type="submit" variant="subtle">Logout</Button>
                    </Form>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Text fw={700} size="lg" mb="md">Manager Dashboard</Text>
                <Stack>
                    <NavLink
                        label="Dashboard"
                        component={Link}
                        to="/manager/dashboard"
                    />
                    <NavLink
                        label="Manage Users"
                        component={Link}
                        to="/manager/users"
                    />
                    <NavLink
                        label="Manage Items"
                        component={Link}
                        to="/manager/menu-items"
                    />
                    <NavLink
                        label="Transaction Log"
                        component={Link}
                        to="/manager/transaction-log"
                    />
                    {/* add more links here */}
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    )
}

export default ManagerView
