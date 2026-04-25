import { useGameStore } from '../store';
import { translations } from '../translations';
import { Play, Globe } from 'lucide-react';

export function CategorySettings() {
  const { room, actions } = useGameStore();
  const t = translations.en;

  if (!room) return null;

  return (
    <div className="space-y-12">
      {room.categories.includes('MOVIE') && (
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
      )}

      {room.categories.includes('CARTOON') && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Play size={20} className="text-vox-black" />
              <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.sourceSelection}</h3>
            </div>
            <span className="handwritten text-sm opacity-60">Pick multiple!</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['Disney/Pixar', 'Disney Princess', 'Cartoon Network', 'Nickelodeon', 'Boomerang', 'Anime', 'Classic 90s'].map(source => {
              const currentSources = room.settings.cartoonSources || (room.settings.cartoonSource ? [room.settings.cartoonSource] : []);
              const isSelected = currentSources.includes(source);
              
              const toggleSource = () => {
                let newSources: string[];
                if (isSelected) {
                  newSources = currentSources.filter(s => s !== source);
                } else {
                  newSources = [...currentSources, source];
                }
                actions.updateSettings({ 
                  cartoonSources: newSources,
                  // Keep cartoonSource in sync for backward compatibility if needed
                  cartoonSource: newSources[0] || ''
                });
              };

              return (
                <button
                  key={source}
                  onClick={toggleSource}
                  className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${isSelected ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                >
                  {source}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {room.categories.includes('LANDMARK') && (
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
      )}
    </div>
  );
}
