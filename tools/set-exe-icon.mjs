// Windows .exe dosyasına simge ve sürüm bilgisi yazar (wine gerektirmez)
// Kullanım: node tools/set-exe-icon.mjs <exe> <ico> <ürün adı> <sürüm> <açıklama>
import * as ResEdit from 'resedit';
import * as PELibrary from 'pe-library';
import fs from 'fs';
const [exe, ico, product, version, desc] = process.argv.slice(2);
const exeData = PELibrary.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(exeData);
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(ico));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const groupId = groups.length ? groups[0].id : 1;
const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, iconFile.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
const v = version.split('.').map(Number);
vi.setFileVersion(v[0], v[1], v[2], 0, 1033);
vi.setProductVersion(v[0], v[1], v[2], 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: product, FileDescription: desc, CompanyName: product, LegalCopyright: product, OriginalFilename: exe.split(/[\\/]/).pop(), InternalName: product });
vi.outputToResourceEntries(res.entries);
res.outputResource(exeData);
fs.writeFileSync(exe, Buffer.from(exeData.generate()));
console.log('icon set:', exe);
