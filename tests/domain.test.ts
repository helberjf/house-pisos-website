import {describe,it,expect} from 'vitest';
import {serialize,whatsapp,status,type PageData} from '../src/domain';
describe('public contract',()=>{
 it('escapes script closing tags',()=>expect(serialize({title:'</script>'})).not.toContain('</script>'));
 it('encodes contextual accents',()=>expect(decodeURIComponent(whatsapp('Porcelanato mármore'))).toContain('Porcelanato mármore'));
 it('unpublished item is a real 404',()=>expect(status({path:'/produtos/privado',items:[],unavailable:false,siteUrl:''})).toBe(404));
 it('backend failure is 503 rather than false 404',()=>expect(status({path:'/produtos/privado',items:[],unavailable:true,siteUrl:''})).toBe(503));
});
