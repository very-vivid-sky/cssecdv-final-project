import { getStatistics } from '../services/api'

export const statisticsLoader = async () => {
    try {
        const response = await getStatistics()
        return response.data
    } catch (error) {
        console.error('Error fetching items:', error)
        return []
    }
}
