import React from 'react'
import { v4 as uuidv4 } from 'uuid';
import { useState, useContext } from 'react';
import { toast } from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom';
import userContext from '../context/userContext';

const IdGenerator = () => {
    const [roomId, setRoomId] = useState("")
    const { user } = useContext(userContext);
    const navigate = useNavigate();
    const location = useLocation();
    const username = user.name;
    const assignment = location.state?.assignment;

    const generateRoomId = (e) => {
        e.preventDefault();
        const ID = uuidv4();
        // console.log(ID);
        setRoomId(ID);
        toast.success("Room ID generated successfully")
    }

    const joinRoom = () => {
        if (!roomId) {
            toast.error("Room Id is required!")
            return;
        }
        else {
            navigate(`/workspace/${roomId}`, {
                state: { username, assignment }
            })
            toast.success("Room created successfully!")
        }

    }

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="flex flex-col items-center justify-center bg-blue-200 py-7 px-4 rounded-2xl shadow-lg w-1/3">
                <p className="text-3xl font-semibold mb-6">coLAB</p>

                <p className="text-xl text-gray-700 font-semibold mb-5">Enter ROOM ID</p>
                <input
                    value={roomId}
                    onChange={(e) => { setRoomId(e.target.value) }}
                    type="text"
                    placeholder="ROOM ID"
                    className="w-full p-2 mb-4 rounded-lg border border-gray-300 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <p className="w-full p-2 mb-4 rounded-lg border border-gray-300 bg-blue-50" >
                    {username.toUpperCase()}
                </p>

                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                    onClick={joinRoom}
                >
                    JOIN ROOM
                </button>

                <p className='py-2 font-medium text-lg text-gray-700'>Don't have a room ID? create
                    <span className='text-blue-600 cursor-pointer' onClick={generateRoomId}>
                        NEW ROOM
                    </span>
                </p>
            </div>
        </div>
    )
}

export default IdGenerator
