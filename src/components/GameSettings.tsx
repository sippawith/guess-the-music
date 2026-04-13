import React, { useState, useEffect } from 'react';
import { Timer, Hash, FastForward, Zap } from 'lucide-react';
import { useGameStore } from '../store';
import { translations } from '../translations';

function SettingInput({ label, icon: Icon, value, min, max, onChange }: { 
  label: string, 
  icon: any, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void 
}) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    const num = parseInt(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
          <Icon size={12} /> {label}
        </div>
      </label>
      <input 
        type="number"
        min={min}
        max={max}
        value={localValue}
        onChange={handleChange}
        className="w-full bg-vox-paper border-2 border-vox-black px-4 py-3 font-black text-lg focus:outline-none focus:ring-0 transition-all text-vox-black"
      />
    </div>
  );
}

export function GameSettings() {
  const { room, actions } = useGameStore();
  const t = translations.en;

  if (!room) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
        <SettingInput 
          label={t.timer}
          icon={Timer}
          value={room.settings.guessTime}
          min={5}
          max={60}
          onChange={(val) => actions.updateSettings({ guessTime: val })}
        />
        <SettingInput 
          label={t.rounds}
          icon={Hash}
          value={room.settings.numTracks}
          min={1}
          max={1000}
          onChange={(val) => actions.updateSettings({ numTracks: val })}
        />
        <SettingInput 
          label={t.break}
          icon={FastForward}
          value={room.settings.intermissionTime}
          min={3}
          max={30}
          onChange={(val) => actions.updateSettings({ intermissionTime: val })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-8 md:mb-12">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.answerMode}</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "TYPING", label: "Keyboard" },
              { id: "CHOICE_4", label: "4 Choices" },
              { id: "CHOICE_5", label: "5 Choices" },
              { id: "CHOICE_CUSTOM", label: "Custom" }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => actions.updateSettings({ gameMode: mode.id as any })}
                className={`vox-button py-3 text-[10px] font-black uppercase tracking-widest ${room.settings.gameMode === mode.id ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {room.settings.gameMode === 'CHOICE_CUSTOM' && (
          <SettingInput 
            label={t.options}
            icon={Hash}
            value={room.settings.numChoices}
            min={2}
            max={10}
            onChange={(val) => actions.updateSettings({ numChoices: val })}
          />
        )}
        {room.category === 'MUSIC' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.guessTarget}</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "SONG", label: "Song" },
                { id: "ARTIST", label: "Artist" },
                { id: "BOTH", label: "Both" }
              ].map(target => (
                <button
                  key={target.id}
                  onClick={() => actions.updateSettings({ guessTarget: target.id as any })}
                  className={`vox-button py-3 text-[10px] font-black uppercase tracking-widest ${room.settings.guessTarget === target.id ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                >
                  {target.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t-2 border-vox-black/10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-lg text-vox-black">{t.tacticalSupport}</h4>
            </div>
            <p className="handwritten text-sm opacity-60 text-vox-black">Enable special power-ups for players</p>
          </div>
          <button
            onClick={() => actions.updateSettings({ abilitiesEnabled: !room.settings.abilitiesEnabled })}
            className={`w-16 h-8 border-2 border-vox-black transition-all relative ${room.settings.abilitiesEnabled ? 'bg-vox-yellow' : 'bg-vox-paper'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-vox-black transition-all ${room.settings.abilitiesEnabled ? 'left-9' : 'left-1'}`} />
          </button>
        </div>

        {room.settings.abilitiesEnabled && (
          <div className="flex items-center gap-8">
            <SettingInput 
              label={t.usesPerGame}
              icon={Zap}
              value={room.settings.abilitiesPerGame}
              min={1}
              max={10}
              onChange={(val) => actions.updateSettings({ abilitiesPerGame: val })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
