import { useState, useEffect } from 'react'
import { Form, useLoaderData, useActionData } from 'react-router-dom'
import {
    AppShell,
    Group,
    Text,
    Button,
    Grid,
    Card,
    TextInput,
    Select,
    Paper,
    Stack,
    Divider,
    Badge,
    ScrollArea,
} from '@mantine/core'

import { notifications } from '@mantine/notifications'

function CashierView() {
    const menuItems = useLoaderData()
    const actionData = useActionData()
    const [orderItems, setOrderItems] = useState([])
    const [customerName, setCustomerName] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Cash')
    const currentCashier = JSON.parse(localStorage.getItem('user'))

    useEffect(() => {
        if (actionData?.success) {
            console.log('success')
            notifications.show({
                title: 'Success',
                position: 'bottom-center',
                message: actionData.message,
                color: 'green',
            })
            setOrderItems([])
            setCustomerName('')
            setPaymentMethod('Cash')
        } else if (actionData?.success === false) {
            notifications.show({
                title: 'Error',
                message: actionData.message,
                color: 'red',
            })
        }
    }, [actionData])

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const total = subtotal

    const addToOrder = (menuItem) => {
        setOrderItems(prev => {
            const existing = prev.find(item => item.id === menuItem.id)
            if (existing) {
                return prev.map(item =>
                    item.id === menuItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                )
            }
            return [...prev, { ...menuItem, quantity: 1 }]
        })
    }

    const updateQuantity = (itemId, newQuantity) => {
        if (newQuantity === 0) {
            setOrderItems(prev => prev.filter(item => item.id !== itemId))
            return
        }
        setOrderItems(prev =>
            prev.map(item =>
                item.id === itemId
                    ? { ...item, quantity: newQuantity }
                    : item,
            ),
        )
    }

    const removeItem = (itemId) => {
        setOrderItems(prev => prev.filter(item => item.id !== itemId))
    }

    return (
        <AppShell
            header={{ height: 60 }}
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
            <AppShell.Main>
                <Grid>
                    {/* Menu Items Section */}
                    <Grid.Col span={8}>
                        <Paper shadow="sm" p="md">
                            <Text size="xl" fw={700} mb="md">Menu Items</Text>
                            <ScrollArea h={600}>
                                <Grid>
                                    {menuItems.map(item => (
                                        <Grid.Col key={item.id} span={4}>
                                            <Card
                                                shadow="sm"
                                                padding="lg"
                                                onClick={() => addToOrder(item)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Stack gap="xs">
                                                    <Badge color="blue">{item.type}</Badge>
                                                    <Text fw={500}>{item.item}</Text>
                                                    <Text c="dimmed">₱{item.price.toFixed(2)}</Text>
                                                </Stack>
                                            </Card>
                                        </Grid.Col>
                                    ))}
                                </Grid>
                            </ScrollArea>
                        </Paper>
                    </Grid.Col>

                    {/* Order Summary Section */}
                    <Grid.Col span={4}>
                        <Paper shadow="sm" p="md">
                            <Stack>
                                <Text size="xl" fw={700}>Current Order</Text>
                                <TextInput
                                    label="Customer Name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.currentTarget.value)}
                                />

                                <ScrollArea h={300}>
                                    {orderItems.map(item => (
                                        <Group key={item.id} justify="space-between" mb="sm">
                                            <Stack gap="xs">
                                                <Text fw={500}>{item.item}</Text>
                                                <Text size="sm" c="dimmed">₱{item.price.toFixed(2)}</Text>
                                            </Stack>
                                            <Group>
                                                <Button
                                                    variant="subtle"
                                                    size="xs"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    -
                                                </Button>
                                                <Text>{item.quantity}</Text>
                                                <Button
                                                    variant="subtle"
                                                    size="xs"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </Button>
                                                <Button
                                                    color="red"
                                                    variant="subtle"
                                                    size="xs"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </Group>
                                        </Group>
                                    ))}
                                </ScrollArea>

                                <Divider />

                                <Group justify="space-between">
                                    <Text>Subtotal:</Text>
                                    <Text>₱{subtotal.toFixed(2)}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text fw={700}>Total:</Text>
                                    <Text fw={700}>₱{total.toFixed(2)}</Text>
                                </Group>

                                <Select
                                    label="Payment Method"
                                    value={paymentMethod}
                                    onChange={setPaymentMethod}
                                    data={['Cash', 'Card', 'GCash']}
                                />

                                <Form method="post">
                                    <input type="hidden" name="orderData" value={JSON.stringify({
                                        cashier: currentCashier.id,
                                        customerName: customerName,
                                        items: orderItems.map(item => ({
                                            item: item.id,
                                            quantity: item.quantity,
                                        })),
                                        paymentMethod: paymentMethod,
                                        totalAmount: total,
                                    })} />
                                    <Button
                                        type="submit"
                                        fullWidth
                                        color="blue"
                                        disabled={orderItems.length === 0}
                                    >
                                        Process Payment
                                    </Button>
                                </Form>
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
            </AppShell.Main>
        </AppShell>
    )
}

export default CashierView
