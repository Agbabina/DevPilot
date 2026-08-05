
interface TagProps{
    priority: string
}

export default function PriotiyTag({priority}: TagProps){
    if (priority==="Low"){
        return(
            <>
                <div className="w-17 bg-emerald-500 text-emerald-900 rounded-lg h-7 ml-4">
                    <h1 className="text-center flex align-middle justify-center">Low</h1>
                </div>
            </>
        )
    }

    if (priority==="Medium"){
        return(
            <>
                <div className="w-17 bg-amber-400 text-yellow-700 rounded-lg h-7 ml-4">
                    <h1 className="text-center flex align-middle justify-center">Medium</h1>
                </div>          
            </>
        )
    }

    if (priority==="High"){
        return(
            <>
                <div className="w-17 bg-red-400 text-rose-950 rounded-lg h-7 ml-4">
                    <h1 className="text-center flex align-middle justify-center">High</h1>
                    </div>          
            </>
        )
    }

}