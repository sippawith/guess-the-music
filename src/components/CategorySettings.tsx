import { useGameStore } from '../store';
import { translations } from '../translations';
import { Play, Globe } from 'lucide-react';

export function CategorySettings() {
  const { room, actions, language } = useGameStore();
  const t = translations[language];

  if (!room) return null;

  if (room.category === 'MOVIE') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play size={20} className="text-vox-black" />
            <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.genreSelection}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {['Action/Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Thai Movies', 'Classic'].map(genre => (
            <button
              key={genre}
              onClick={() => actions.updateSettings({ movieGenre: genre })}
              className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.movieGenre === genre ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (room.category === 'CARTOON') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play size={20} className="text-vox-black" />
            <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.sourceSelection}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {['Disney/Pixar', 'Disney Princess', 'Cartoon Network', 'Nickelodeon', 'Anime', 'Classic 90s'].map(source => (
            <button
              key={source}
              onClick={() => actions.updateSettings({ cartoonSource: source })}
              className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.cartoonSource === source ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (room.category === 'LANDMARK') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-vox-black" />
            <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.regionalSelection}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {['Global', 'Asia', 'Australia', 'Europe', 'Americas'].map(region => (
            <button
              key={region}
              onClick={() => actions.updateSettings({ landmarkRegion: region })}
              className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.landmarkRegion === region ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
