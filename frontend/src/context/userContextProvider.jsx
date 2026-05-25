import React from 'react'
import userContext from './userContext'

const UserContextProvider = ({ children, value }) => {
    return (
        <userContext.Provider value={value}>
            {children}
        </userContext.Provider>
    )
}

export default UserContextProvider
