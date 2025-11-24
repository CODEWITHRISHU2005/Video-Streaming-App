import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaTimes, FaSort } from 'react-icons/fa';
import { Button, TextInput, Dropdown, Badge } from 'flowbite-react';
import { useVideo } from '../../context/VideoContext';

function VideoSearch() {
  const { searchQuery, filters, searchVideos, fetchVideos } = useVideo();
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchVideos(searchTerm);
    } else {
      fetchVideos();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchVideos();
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...localFilters, [filterType]: value };
    setLocalFilters(newFilters);
    // In a real app, you would apply filters here
    console.log('Filters changed:', newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      duration: 'all',
      date: 'all',
      quality: 'all'
    };
    setLocalFilters(defaultFilters);
  };

  const durationOptions = [
    { label: 'All durations', value: 'all' },
    { label: 'Under 4 minutes', value: 'short' },
    { label: '4-20 minutes', value: 'medium' },
    { label: 'Over 20 minutes', value: 'long' }
  ];

  const dateOptions = [
    { label: 'All time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This week', value: 'week' },
    { label: 'This month', value: 'month' },
    { label: 'This year', value: 'year' }
  ];

  const qualityOptions = [
    { label: 'All qualities', value: 'all' },
    { label: '1080p', value: '1080' },
    { label: '720p', value: '720' },
    { label: '480p', value: '480' },
    { label: '360p', value: '360' }
  ];

  const sortOptions = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Upload date', value: 'date' },
    { label: 'View count', value: 'views' },
    { label: 'Duration', value: 'duration' },
    { label: 'Title', value: 'title' }
  ];

  const activeFiltersCount = Object.values(localFilters).filter(value => value !== 'all').length;

  return (
    <div className="bg-neutral-800 rounded-lg shadow-xl p-4 mb-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-4">
        <div className="flex-1 relative">
          <TextInput
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400 focus:ring-primary focus:border-primary"
            icon={FaSearch}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
        
        <Button
          type="submit"
          color="primary"
          className="px-6 py-2.5 rounded-md font-semibold text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
        >
          Search
        </Button>
        
        <Button
          type="button"
          color="gray"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-md font-semibold transition-colors duration-200 ${showFilters ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-neutral-700 text-white hover:bg-neutral-600'}`}
        >
          <FaFilter />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Badge color="accent" className="ml-1 bg-accent text-neutral-900">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </form>

      {/* Filters Section */}
      {showFilters && (
        <div className="border-t border-neutral-700 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Filters
            </h3>
            <Button
              size="sm"
              color="gray"
              onClick={clearFilters}
              className="text-xs bg-neutral-700 text-white hover:bg-neutral-600"
            >
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Duration Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Duration
              </label>
              <Dropdown label={durationOptions.find(opt => opt.value === localFilters.duration)?.label || 'Duration'}
                className="w-full bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
                renderTrigger={() => (
                  <Button className="w-full justify-between bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600 focus:ring-primary focus:border-primary">
                    {durationOptions.find(opt => opt.value === localFilters.duration)?.label || 'Duration'} <FaSort className="ml-2" />
                  </Button>
                )}
              >
                {durationOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    onClick={() => handleFilterChange('duration', option.value)}
                    className={`${localFilters.duration === option.value ? "bg-primary-dark text-white" : "text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Upload Date
              </label>
              <Dropdown label={dateOptions.find(opt => opt.value === localFilters.date)?.label || 'Date'}
                className="w-full bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
                renderTrigger={() => (
                  <Button className="w-full justify-between bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600 focus:ring-primary focus:border-primary">
                    {dateOptions.find(opt => opt.value === localFilters.date)?.label || 'Date'} <FaSort className="ml-2" />
                  </Button>
                )}
              >
                {dateOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    onClick={() => handleFilterChange('date', option.value)}
                    className={`${localFilters.date === option.value ? "bg-primary-dark text-white" : "text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Quality
              </label>
              <Dropdown label={qualityOptions.find(opt => opt.value === localFilters.quality)?.label || 'Quality'}
                className="w-full bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
                renderTrigger={() => (
                  <Button className="w-full justify-between bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600 focus:ring-primary focus:border-primary">
                    {qualityOptions.find(opt => opt.value === localFilters.quality)?.label || 'Quality'} <FaSort className="ml-2" />
                  </Button>
                )}
              >
                {qualityOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    onClick={() => handleFilterChange('quality', option.value)}
                    className={`${localFilters.quality === option.value ? "bg-primary-dark text-white" : "text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Sort by
              </label>
              <Dropdown label="Relevance" icon={FaSort}
                className="w-full bg-neutral-700 border-neutral-600 text-white focus:ring-primary focus:border-primary"
                renderTrigger={() => (
                  <Button className="w-full justify-between bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600 focus:ring-primary focus:border-primary">
                    {sortOptions.find(opt => opt.value === localFilters.sort)?.label || 'Relevance'} <FaSort className="ml-2" />
                  </Button>
                )}
              >
                {sortOptions.map((option) => (
                  <Dropdown.Item
                    key={option.value}
                    onClick={() => handleFilterChange('sort', option.value)}
                    className={`${localFilters.sort === option.value ? "bg-primary-dark text-white" : "text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                  >
                    {option.label}
                  </Dropdown.Item>
                ))}
              </Dropdown>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm text-neutral-400">Active filters:</span>
              {Object.entries(localFilters).map(([key, value]) => {
                if (value === 'all') return null;
                
                let label = '';
                switch (key) {
                  case 'duration':
                    label = durationOptions.find(opt => opt.value === value)?.label;
                    break;
                  case 'date':
                    label = dateOptions.find(opt => opt.value === value)?.label;
                    break;
                  case 'quality':
                    label = qualityOptions.find(opt => opt.value === value)?.label;
                    break;
                  case 'sort':
                    label = sortOptions.find(opt => opt.value === value)?.label;
                    break;
                  default:
                    label = value;
                }

                return (
                  <Badge
                    key={key}
                    color="primary"
                    className="flex items-center space-x-1 bg-primary text-white"
                  >
                    <span>{label}</span>
                    <button
                      onClick={() => handleFilterChange(key, 'all')}
                      className="ml-1 text-white hover:text-red-300"
                    >
                      <FaTimes size={10} />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoSearch; 