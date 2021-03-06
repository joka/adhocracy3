"""Adhocracy extension."""
from pyramid.config import Configurator

from adhocracy_core import root_factory


def includeme(config):
    """Setup adhocracy extension."""
    config.include('adhocracy_core')
    config.commit()
    config.include('.sheets')
    config.include('.resources')
    config.include('.workflows')
    config.include('.evolution')
    config.add_translation_dirs('adhocracy_core:locale/',
                                'adhocracy_spd:locale/')


def main(global_config, **settings):
    """Return a Pyramid WSGI application."""
    config = Configurator(settings=settings, root_factory=root_factory)
    includeme(config)
    return config.make_wsgi_app()
