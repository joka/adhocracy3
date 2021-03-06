Python
======

Test Driven Development
-----------------------

* 100% unit test coverage (must)
* use `pytest <http://pytest.org/>`_ fixtures to mock/create dependencies, functional tests have the `functional` marker, integration are using a fixture called `integration`.
* Test driven development with functional/integration and unit test (should)

    concept: http://en.wikipedia.org/wiki/Test-driven_development

    1. write function/integration test
    2. write unit test (simplest statement first)
    3. switch between writing code and change/extend tests until all test pass
    4. refactor


Refactor towards Clean Code
---------------------------

see (:doc:`../refactor_guidelines`)


Imports
-------

* one import per line
* don't use * to import everything from a module
* don't use relative import paths
* dont catch ``ImportError`` to detect wheter a package is available or not, as
  it might hide circular import errors. Instead use
  ``pkgresources.getdistribution`` and catch ``DistributionNotFound``.
  (http://do3.cc/blog/2010/08/20/do-not-catch-import-errors,-use-pkg_resources/)

Code formatting
---------------

* 4 spaces instead of tabs (must)
* no trailing white space (must)

* `pep8 <http://legacy.python.org/dev/peps/pep-0008/>`_ (must)
* pyflakes (must)
* pylint (should)
* mcabe (should)

* Advances String Formatting `pep3101 <http://legacy.python.org/dev/peps/pep-3101/>`_ (must)

* Single Quotes for strings except for docstrings (must)


Docstring formatting
--------------------

* pep257 (must, bei tests und zope.Interface classes should)
* python 3 type annotation (must) according to
  https://pypi.python.org/pypi/sphinx_typesafe
* javadoc-style parameter descriptions, see
  http://sphinx-doc.org/domains.html#info-field-lists (should)
* example::

    def methodx(self, a: dict, flag=False) -> str:
        """Do something.

        :param a: description for a
        :param flag: description for flag
        :return: something special
        :raise ValueError: if a is invalid
        """
