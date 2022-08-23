import { InitParser } from "../src/lib/parser";


const start = async () => 
{
    const parser = await InitParser('./test/tpl')

    console.log(parser.Parse('[[test1]]', {toto: 'params1', titi: 'params2'}))
}
start()