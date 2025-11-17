import { useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import {
    Grid,
    Paper,
    Text,
    Title,
    Group,
    Stack,
    RingProgress,
    Table,
    SegmentedControl,
    Card,
} from '@mantine/core'
import { LineChart, BarChart } from '@mantine/charts'

export default function Dashboard() {
    const statistics = useLoaderData()
    const [timeFrame, setTimeFrame] = useState('today')

    const timeFrameData = statistics[timeFrame]

    // Calculate payment method percentages
    const totalPayments = Object.values(statistics.paymentMethods).reduce((a, b) => a + b, 0)
    const paymentPercentages = {
        GCash: (statistics.paymentMethods.GCash / totalPayments) * 100 || 0,
        Cash: (statistics.paymentMethods.Cash / totalPayments) * 100 || 0,
        Card: (statistics.paymentMethods.Card / totalPayments) * 100 || 0,
    }

    // Prepare hourly data for line chart
    const hourlyData = statistics.hourlyDistribution.map((value, index) => ({
        hour: `${index}:00`,
        orders: value,
    }))

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between" align="center">
                <Title order={2}>Dashboard Overview</Title>
                <SegmentedControl
                    value={timeFrame}
                    onChange={setTimeFrame}
                    data={[
                        { label: 'Today', value: 'today' },
                        { label: 'Weekly', value: 'weekly' },
                        { label: 'Monthly', value: 'monthly' },
                    ]}
                />
            </Group>

            {/* Key Metrics */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md">
                        <div>
                            <Text size="xs" c="dimmed">Total Orders</Text>
                            <Text fw={500} size="lg">{timeFrameData.totalOrders}</Text>
                        </div>
                    </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md">
                        <div>
                            <Text size="xs" c="dimmed">Total Sales</Text>
                            <Text fw={500} size="lg">₱{timeFrameData.totalSales}</Text>
                        </div>
                    </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md">
                        <div>
                            <Text size="xs" c="dimmed">Average Order Value</Text>
                            <Text fw={500} size="lg">₱{timeFrameData.averageOrderValue}</Text>
                        </div>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Charts Section */}
            <Grid>
                {/* Payment Methods */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder padding="md">
                        <Title order={3} mb="md">Payment Methods</Title>
                        <Group justify="space-around">
                            <RingProgress
                                size={120}
                                roundCaps
                                thickness={8}
                                sections={[{ value: paymentPercentages.GCash, color: 'blue' }]}
                                label={
                                    <Text ta="center" size="xs">
                                        GCash
                                        <br />
                                        {Math.round(paymentPercentages.GCash)}%
                                    </Text>
                                }
                            />
                            <RingProgress
                                size={120}
                                roundCaps
                                thickness={8}
                                sections={[{ value: paymentPercentages.Cash, color: 'green' }]}
                                label={
                                    <Text ta="center" size="xs">
                                        Cash
                                        <br />
                                        {Math.round(paymentPercentages.Cash)}%
                                    </Text>
                                }
                            />
                            <RingProgress
                                size={120}
                                roundCaps
                                thickness={8}
                                sections={[{ value: paymentPercentages.Card, color: 'orange' }]}
                                label={
                                    <Text ta="center" size="xs">
                                        Card
                                        <br />
                                        {Math.round(paymentPercentages.Card)}%
                                    </Text>
                                }
                            />
                        </Group>
                    </Card>
                </Grid.Col>

                {/* Hourly Distribution */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder padding="md">
                        <Title order={3} mb="md">Hourly Orders Distribution</Title>
                        <LineChart
                            h={200}
                            data={hourlyData}
                            dataKey="hour"
                            series={[{ name: 'orders', color: 'blue' }]}
                            curveType="linear"
                        />
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Top Selling Items & Cashier Performance */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder padding="md">
                        <Title order={3} mb="md">Top Selling Items</Title>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Item</Table.Th>
                                    <Table.Th>Quantity</Table.Th>
                                    <Table.Th>Revenue</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {statistics.topSellingItems.map((item) => (
                                    <Table.Tr key={item.name}>
                                        <Table.Td>{item.name}</Table.Td>
                                        <Table.Td>{item.quantity}</Table.Td>
                                        <Table.Td>₱{item.revenue}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder padding="md">
                        <Title order={3} mb="md">Cashier Performance</Title>
                        <BarChart
                            h={200}
                            data={statistics.cashierPerformance}
                            dataKey="name"
                            series={[
                                { name: 'totalOrders', color: 'blue' },
                                { name: 'totalSales', color: 'green' },
                            ]}
                        />
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    )
}

