import React from 'react'
import Avatar from 'react-avatar'

const Members = ({ username }) => {
    return (
        <div className='flex items-center my-1 gap-2'>
            <Avatar name={username.toString()} size={50} round="14px" />
            <span className='text-sm'>{(username.toString()).toUpperCase()}</span>
        </div>
    )
}

export default Members
