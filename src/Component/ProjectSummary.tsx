import {Box} from "lucide-react"
interface ProjectSummaryProps{
    title: string,
    description:string,
    taskProgress:number
}


function ProjectSummary({title, description, taskProgress}: ProjectSummaryProps){
    return(
            <>
                <div className="flex-1">
                    <div>
                        <Box size={24} color="purple"></Box>
                    </div>
                    <h3 className="font-semibold">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {description}
                    </p>

                    <div className="mt-2 h-2 rounded-full bg-gray-200">
                        <div className="h-2 w-[60%] rounded-full bg-blue-600" />
                    </div>
                    
                </div>

                <span className="text-sm text-gray-500">
                    {taskProgress}%
                </span>
        </>
    )
}

export default ProjectSummary;
