import { queryOptions } from '@tanstack/react-query'
import { getCodesFn } from '../code'

export const CODES_QUERY_KEY = {
    codes: ['codes']
}
export const codesQueryOptions  = () => {
    return (
        queryOptions({
        queryKey: CODES_QUERY_KEY.codes,
        queryFn:  () =>  getCodesFn()
    })
    )
}