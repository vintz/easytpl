import * as FS from 'fs'
import * as Path from 'path'

import {  Watchable } from "./watcher";

// const cb = (ev: WatchEvent) => 
//     {   

//     }

//     params = Watch(params, cb)

interface ParsingInProgress 
{
    AlreadyParsed: string[]
}



export class ParserError extends Error
{

}

export const InitParser = async (folderPath: string) =>
{

    const initParserObjects = (folderPath: string): Promise<Record<string, string>> => 
    {
        let res: Record<string, string> = {}
        return new Promise<Record<string, string>>((resolve, reject) =>
        {
            FS.readdir(folderPath, async (err, files: string[]) =>
            {
                if (err)
                {
                    return reject(err.message)
                }
                for (let i = 0; i < files.length; i++)
                {
                    const curr = files[i]
                    if (curr.endsWith('.tpl'))
                    {
                        const tmp = await readFile(folderPath, curr)
                        res = {...res, ...tmp}
                    }
                }
                resolve(res)
            })
        })
    }

    const readFile = async (folderPath: string, filename: string) =>
    {
        return new Promise<Record<string, string>>((resolve, reject) =>
        {
            FS.readFile(Path.join(folderPath, filename), { encoding: 'utf8' }, (err, data) =>
            {
                if (err)
                {
                    reject(err.message)
                }
                const res: Record<string, string> = {}
                res[filename.substring(0, filename.length-4).toLowerCase()] = data

                resolve(res)
            })
        })
    }

    const objects = await initParserObjects(folderPath)

    const Parse = (code: string, params: Watchable) => 
    {
        const res = parseObjects(code, params)
        return res
    }

    const getParam = (params: Watchable, key: string) => 
    {
        let res: Watchable = params
        const elems = key.split('.')
        while (elems.length > 0 && typeof res === 'object')
        {
            const elem = elems.shift()
            res = (res[elem] as Watchable)
        }
        return res

    }

    const replaceParams = (code: string, params: Watchable) => 
    {
        const regex = /{{([^\{]*)}}/g
        return code.replace(regex, (_: string, capture: string) => 
        {
            const value = getParam(params, capture)
            return (value ? value : '').toString()
        })
    }

    const parseElems = (params: Watchable, attributes: string[]) => 
    {
        let subParams = params
        let tmpParams: Watchable = {}
        for (let i = 0; i < attributes.length; i++)
        {
            const curAttribute = attributes[0].split('=', 2)
            if (curAttribute.length == 2)
            {
                if (curAttribute[0].toLowerCase() === '_params')
                {
                    subParams = getParam(params, curAttribute[1])
                }
                else 
                {
                    tmpParams[curAttribute[0]] = curAttribute[1]
                }
            }
        }

        if (Array.isArray(subParams))
        {
            for (let i = 0; i < subParams.length; i++)  
            {
                subParams[i] = { ...subParams[i], ...tmpParams }
            }
            return subParams
        }

        return { ...subParams, ...tmpParams }
    }

    const parseObjects = (code: string, params: Watchable, inProgress: ParsingInProgress = { AlreadyParsed: [] }) => 
    {
        const regex = /\[\[([^\[]*)\]\]/g

        return code.replace(regex, (substring: string, capture: string) => 
        {
            const elems = capture.split(' ')
            const objName = elems.shift().toLowerCase()
            if (inProgress.AlreadyParsed.some((value) => { return value === objName }))
            {
                throw new ParserError(`Recursion occured`)
            }
            const subParams = parseElems(params, elems)
            inProgress.AlreadyParsed.push(objName)
            const res = parseObject(objName, subParams, inProgress)
            inProgress.AlreadyParsed.pop()
            return res
        })
    }

    const parseObject = (objName: string, params: Watchable, inProgress: ParsingInProgress) =>
    {

        let code = objects[objName]
        if (code)
        {
            code = parseObjects(code, params, inProgress)
            let res = ''
            if (Array.isArray(params))
            {
                for (let i = 0; i < params.length; i++)
                {
                    res += replaceParams(code, params[i] as Watchable)
                }
            }
            else 
            {
                res = replaceParams(code, params as Watchable)
            }


            return res
        }

        throw new ParserError(`Object ${objName} not found`)
    }




    return { Parse }

}

